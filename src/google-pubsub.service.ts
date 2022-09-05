import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { GoogleCloudPubSubClient } from './client/google-pubsub.client';
import { PubSubConfig } from './utils/google-pubsub.config';

@Injectable()
export class GooglePubSubService implements OnModuleInit, OnModuleDestroy {
  protected readonly client: ClientProxy;

  constructor(config: PubSubConfig) {
    this.client = new GoogleCloudPubSubClient(config);
  }

  emit(pattern: string, data: object): Observable<any> {
    return this.client.emit(pattern, data);
  }

  send(pattern: string, data: object): Observable<any> {
    return this.client.send(pattern, data);
  }

  onModuleInit() {
    return this.client.connect();
  }

  onModuleDestroy() {
    return this.client.close();
  }
}
