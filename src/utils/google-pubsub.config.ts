import {
  ClientConfig,
  PublishOptions,
  SubscriberOptions,
} from '@google-cloud/pubsub';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common';

import { GooglePubSubOptions } from './google-pubsub.interface';
import { PubSubService } from '../google-pubsub.service';

export class PubSubConfig implements GooglePubSubOptions {
  constructor(
    public clientConfig: ClientConfig,
    public topic?: string,
    public subscription?: string,
    public replyTopic?: string,
    public replySubscription?: string,
    public noAck?: boolean,
    public publisher?: PublishOptions,
    public subscriber?: SubscriberOptions
  ) { }
}

export interface PubSubOptionsFactory {
  createPubSubOptions(): Promise<PubSubConfig> | PubSubConfig;
}

export function createPubSubClient(options: PubSubConfig): PubSubService {
  const client = new PubSubService(options);
  return client;
}

export interface PubSubModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<PubSubOptionsFactory>;
  useClass?: Type<PubSubOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<PubSubConfig> | PubSubConfig;
}
