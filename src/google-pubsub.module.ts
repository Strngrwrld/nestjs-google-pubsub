import { Module, DynamicModule, Provider, Type } from '@nestjs/common';

import {
  createPubSubClient,
  PubSubModuleAsyncOptions,
  PubSubOptionsFactory,
  PubSubConfig,
} from './utils/google-pubsub.config';
import { PUB_SUB_MODULE_OPTIONS } from './utils/google-pubsub.constants';
import { GooglePubSubService } from './google-pubsub.service';

@Module({
  providers: [GooglePubSubService],
  exports: [GooglePubSubService],
})
export class GooglePubSubModule {
  static forRootAsync(options: PubSubModuleAsyncOptions): DynamicModule {
    const provider: Provider = {
      inject: [PUB_SUB_MODULE_OPTIONS],
      provide: GooglePubSubService,
      useFactory: (options: PubSubConfig) => createPubSubClient(options),
    };

    return {
      global: true,
      module: GooglePubSubModule,
      providers: [...this.createAsyncProviders(options), provider],
    };
  }

  private static createAsyncProviders(
    options: PubSubModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<PubSubOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass: useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: PubSubModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: PUB_SUB_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    const inject = [
      (options.useClass || options.useExisting) as Type<PubSubOptionsFactory>,
    ];

    return {
      provide: PUB_SUB_MODULE_OPTIONS,
      useFactory: async (optionsFactory: PubSubOptionsFactory) =>
        await optionsFactory.createPubSubOptions(),
      inject,
    };
  }
}
