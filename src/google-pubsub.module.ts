import { Module, DynamicModule, Provider, Type } from '@nestjs/common';

import {
  createPubSubClient,
  PubSubModuleAsyncOptions,
  PubSubOptionsFactory,
  PubSubConfig,
} from './google-pubsub.config';
import { PUB_SUB_MODULE_OPTIONS } from './google-pubsub.constants';
import { PubSubService } from './google-pubsub.service';

@Module({
  providers: [PubSubService],
  exports: [PubSubService],
})
export class GooglePubSubModule {
  static forRootAsync(options: PubSubModuleAsyncOptions): DynamicModule {
    const provider: Provider = {
      inject: [PUB_SUB_MODULE_OPTIONS],
      provide: PubSubService,
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
