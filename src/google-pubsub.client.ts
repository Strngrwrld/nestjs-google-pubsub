import {
  ClientConfig,
  Message,
  PubSub,
  Subscription,
  Topic,
} from '@google-cloud/pubsub';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import {
  ClientProxy,
  IncomingResponse,
  ReadPacket,
  WritePacket,
} from '@nestjs/microservices';
import { ERROR_EVENT, MESSAGE_EVENT } from '@nestjs/microservices/constants';
import { ALREADY_EXISTS } from './google-pubsub.constants';
import { GooglePubSubOptions } from './google-pubsub.interface';

export class GoogleCloudPubSubClient extends ClientProxy {
  /**
   * Logger
   */
  protected logger: Logger = new Logger(GoogleCloudPubSubClient.name);

  protected topic: Topic | null = null;
  protected replySubscription: Subscription | null = null;
  protected pubSubClient: PubSub | null = null;
  //private readonly topics: Map<string, Topic>;
  //private readonly options?: ClientConfig;

  protected readonly topicName: string;
  protected readonly clientConfig: ClientConfig;
  protected readonly replyTopicName: string;
  protected readonly replySubscriptionName: string;
  protected readonly noAck: boolean;

  constructor(options: GooglePubSubOptions) {
    super();

    this.clientConfig = options.clientConfig;
    this.topicName = options.topic;
    this.replyTopicName = options.replyTopic;
    this.replySubscriptionName = options.replySubscription;
    this.noAck = options.noAck;
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
    //this.topics = new Map();
  }

  async connect(): Promise<PubSub> {
    if (this.pubSubClient) {
      return this.pubSubClient;
    }

    this.pubSubClient = this.createClient();
    this.topic = this.pubSubClient.topic(this.topicName);

    const replyTopic = this.pubSubClient.topic(this.replyTopicName);
    /* await this.createIfNotExists(replyTopic.create.bind(replyTopic)); */

    this.replySubscription = replyTopic.subscription(
      this.replySubscriptionName,
    );

    /* await this.createIfNotExists(
      this.replySubscription.create.bind(this.replySubscription),
    ); */

    this.replySubscription
      .on(MESSAGE_EVENT, async (message: Message) => {
        await this.handleResponse(message.data);
        if (this.noAck) {
          message.ack();
        }
      })
      .on(ERROR_EVENT, (err: any) => this.logger.error(JSON.stringify(err)));

    console.debug('connect');
    return this.pubSubClient;
  }

  async close() {
    if (!this.topic) {
      throw new InternalServerErrorException('Topic not initialized')
    }

    if (!this.pubSubClient) {
      throw new InternalServerErrorException('PubSub Client not initialized')
    }

    await this.topic.flush();
    await this.pubSubClient.close();
    this.pubSubClient = null;
    this.topic = null;
    this.replySubscription = null;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected publish(
    partialPacket: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): () => void {
    try {
      // prepare the outbound packet, and do other setup steps
      const packet = this.assignPacketId(partialPacket);
      const data = this.serializer.serialize(packet);
      this.routingMap.set(packet.id, callback);

      if (this.topic) {
        this.topic
          .publishMessage({
            json: data,
            attributes: { ...data.metadata, replyTo: this.replyTopicName },
          })
          .catch((err) => callback({ err }));
      } else {
        callback({ err: new Error('Topic is not created') });
      }

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  public async createIfNotExists(create: () => Promise<any>) {
    try {
      await create();
    } catch (error: any) {
      if (error.code !== ALREADY_EXISTS) {
        throw error;
      }
    }
  }

  public async handleResponse(data: Buffer) {
    const rawMessage = JSON.parse(data.toString());
    //console.debug('rawMessage :' + JSON.stringify(rawMessage));

    const { err, response, isDisposed, id } = this.deserializer.deserialize(
      rawMessage,
    ) as IncomingResponse;
    const callback = this.routingMap.get(id);
    if (!callback) {
      return;
    }

    if (err || isDisposed) {
      return callback({
        err,
        response,
        isDisposed,
      });
    }
    callback({
      err,
      response,
    });
  }

  /**
   * Handle incoming Pub/Sub `message`.
   *
   * A Pub/Sub message is comprised of some metadata and a payload. The metadata
   * contains filtering info such as event type, data format, etc. and the payload
   * `data` field contains the actual information to be processed.
   */

  protected async dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
    if (this.pubSubClient === undefined) {
      return undefined;
    }

    console.debug('dispatchEvent : ' + JSON.stringify(packet));


    if (!this.topic) {
      throw new InternalServerErrorException('Topic not initialized')
    }

    const data = this.serializer.serialize(packet);
    this.topic.publishMessage(
      { json: data, attributes: data.metadata },
      (err) => {
        if (err) {
          this.logger.error(err);
        }
      },
    );
  }

  /**
   * Redecorates the packet with additional supported fields.
   */
  /*   protected serialize(packet: MetaPacket & ReadPacket): {
    packet: any;
    metadata: Record<string, any>;
  } {
    const metadata = {
      event: packet.pattern,
    };
    delete packet.pattern; // Use `event` instead.
    return { packet: packet.data, metadata };
  }
*/
  private createClient(): PubSub {
    return new PubSub(this.clientConfig);
  }
}
