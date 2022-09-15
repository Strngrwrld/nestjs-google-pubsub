import {
  ClientConfig,
  PublishOptions,
  SubscriberOptions,
} from '@google-cloud/pubsub';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { Type } from '@nestjs/common';

import { GooglePubSubOptions } from './google-pubsub.interface';
import { GooglePubSubService } from '../google-pubsub.service';

export class PubSubConfig implements GooglePubSubOptions {
  constructor(
    public clientConfig: ClientConfig,
    public topic?: string,
    public isEncode?: boolean,
    public subscription?: string,
    public replyTopic?: string,
    public replySubscription?: string,
    public noAck?: boolean,
    public publisher?: PublishOptions,
    public subscriber?: SubscriberOptions,
  ) {}
}

export interface PubSubOptionsFactory {
  createPubSubOptions(): Promise<PubSubConfig> | PubSubConfig;
}

export function createPubSubClient(options: PubSubConfig): GooglePubSubService {
  if (options.isEncode) {
    const credencias = { private_key: Buffer.from('base64').toString() };
    options.clientConfig.credentials = { ...credencias };
  }

  const client = new GooglePubSubService(options);
  return client;
}

export interface PubSubModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<PubSubOptionsFactory>;
  useClass?: Type<PubSubOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<PubSubConfig> | PubSubConfig;
}
