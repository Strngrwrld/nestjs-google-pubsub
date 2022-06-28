import { ClientConfig } from '@google-cloud/pubsub';
import { PublishOptions } from '@google-cloud/pubsub/build/src/publisher';
import { SubscriberOptions } from '@google-cloud/pubsub/build/src/subscriber';

export interface GooglePubSubOptions {
  topic?: string;
  replyTopic?: string;
  subscription?: string;
  replySubscription?: string;
  noAck?: boolean;
  publisher?: PublishOptions;
  subscriber?: SubscriberOptions;
  clientConfig: ClientConfig;
}
