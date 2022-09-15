import {
  ClientConfig,
  Message,
  PubSub,
  Subscription,
  Topic,
} from '@google-cloud/pubsub';
import {
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_MESSAGE_HANDLER,
} from '@nestjs/microservices/constants';
import { InternalServerErrorException } from '@nestjs/common';
import {
  CustomTransportStrategy,
  IncomingRequest,
  OutgoingResponse,
  Server,
} from '@nestjs/microservices';
import { ALREADY_EXISTS } from '../utils/google-pubsub.constants';
import { GooglePubSubOptions } from '../utils/google-pubsub.interface';
import {
  closePubSub,
  closeSubscription,
  flushTopic,
} from '../utils/google-pubsub.utils';
import { Observable } from 'rxjs';
import { isString } from 'util';
import { GooglePubSubContext } from '../utils/google-pubsub.context';

/**
 * Supported server options.
 */
export interface EventPattern {
  event: string;
  format: string;
}

export class GoogleCloudPubSubServer
  extends Server
  implements CustomTransportStrategy
{
  //protected readonly logger = new Logger(GoogleCloudPubSubServer.name);

  protected readonly clientConfig: ClientConfig;
  protected readonly topicName: string;
  //protected readonly publisherConfig: PublishOptions;
  protected readonly subscriptionName: string;
  //protected readonly subscriberConfig: SubscriberOptions;
  protected readonly noAck: boolean;
  protected readonly replyTopics: Set<string>;
  protected readonly topics: Map<string, Topic> = new Map();

  public pubsub: PubSub | null = null;
  protected subscription: Subscription | null = null;

  constructor(private readonly options: GooglePubSubOptions) {
    super();

    this.clientConfig = this.options.clientConfig;
    this.subscriptionName = this.options.subscription;
    this.replyTopics = new Set();
    this.topicName = this.options.topic;
    this.noAck = this.options.noAck;

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  /**
   * This method is triggered when you run "app.listen()".
   */
  async listen(callback: () => void) {
    console.debug('Listen pubsub server');
    this.pubsub = new PubSub(this.clientConfig);
    const topic = this.pubsub.topic(this.topicName);

    /* await this.createIfNotExists(topic.create.bind(topic)); */

    this.subscription = topic.subscription(this.subscriptionName);

    /*     await this.createIfNotExists(
      this.subscription.create.bind(this.subscription),
    ); */

    this.subscription
      .on(MESSAGE_EVENT, async (message: Message) => {
        await this.handleMessage(message);
        if (this.noAck) {
          message.ack();
        }
      })
      .on(ERROR_EVENT, (err: any) => console.debug(err));

    callback();
  }

  /**
   * This method is triggered on application shutdown.
   */
  async close() {
    console.debug('Close pubsub server');
    await closeSubscription(this.subscription);

    if (!this.pubsub) {
      throw new InternalServerErrorException('Pub/Sub not initialized');
    }

    await Promise.all(
      Array.from(this.replyTopics.values()).map((replyTopic) => {
        return flushTopic(this.pubsub.topic(replyTopic));
      }),
    );

    this.replyTopics.clear();

    await closePubSub(this.pubsub);
  }

  /**
   * Handle server error
   */
  protected handleError = (error: unknown): void => {
    console.debug({
      message: 'An error occurred with the GoogleCloudPubSubServer',
      error,
    });

    if (error instanceof Error) {
      super.handleError(error.message);

      return;
    }

    return;
  };

  /**
   * Handle incoming Pub/Sub `message`.
   *
   * A Pub/Sub message is comprised of some metadata and a payload. The metadata
   * contains filtering info such as event type, data format, etc. and the payload
   * `data` field contains the actual information to be processed.
   */
  public async handleMessage(message: Message) {
    const { data, attributes } = message;
    const rawMessage = JSON.parse(data.toString());
    console.debug('message pubsub: ', rawMessage);

    const packet = this.deserializer.deserialize(rawMessage) as IncomingRequest;

    const pattern = isString(packet.pattern)
      ? packet.pattern
      : JSON.stringify(packet.pattern);

    const context = new GooglePubSubContext([message, pattern]);
    const correlationId = packet.id;

    if (correlationId == undefined) {
      return this.handleEvent(pattern, packet, context);
    }

    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: correlationId,
        status,
        err: NO_MESSAGE_HANDLER,
      };

      return this.sendMessage(
        noHandlerPacket,
        attributes.replyTo,
        correlationId,
      );
    }

    const response$ = this.transformToObservable(
      await handler(packet.data, context),
    ) as Observable<any>;

    const publish = <T>(data: T) =>
      this.sendMessage(data, attributes.replyTo, correlationId);
    response$ && this.send(response$, publish);
  }

  public async sendMessage<T = any>(
    message: T,
    replyTo: string,
    id: string,
  ): Promise<void> {
    if (!this.pubsub) {
      throw new InternalServerErrorException('Pub/Sub not initialized');
    }

    Object.assign(message, { id });

    const outgoingResponse = this.serializer.serialize(
      message as unknown as OutgoingResponse,
    );

    this.replyTopics.add(replyTo);
    console.debug(`Seding message to ${replyTo}`, { json: outgoingResponse });
    await this.pubsub.topic(replyTo).publishMessage({ json: outgoingResponse });
  }
/* 
  public async createIfNotExists(create: () => Promise<any>) {
    try {
      await create();
    } catch (error: any) {
      if (error.code !== ALREADY_EXISTS) {
        throw error;
      }
    }
  } */
}
