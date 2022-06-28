import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { GoogleCloudPubSubClient } from './google-pubsub.client';
import { PubSubConfig } from './google-pubsub.config';

@Injectable()
export class PubSubService implements OnModuleInit, OnModuleDestroy {
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

  onModuleDestroy(): void {
    this.client.close();
  }

  onModuleInit(): void {
    this.client.connect();
  }
}
