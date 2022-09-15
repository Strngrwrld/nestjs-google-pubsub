import { PublishOptions } from '@google-cloud/pubsub/build/src/publisher';
import { SubscriberOptions } from '@google-cloud/pubsub/build/src/subscriber';
import { GoogleCredentials } from './google-credentials.interface';

export interface GooglePubSubOptions {
  credentials: GoogleCredentials;
  isEncode?: boolean;
  topic?: string;
  replyTopic?: string;
  subscription?: string;
  replySubscription?: string;
  noAck?: boolean;
  publisher?: PublishOptions;
  subscriber?: SubscriberOptions;
}
