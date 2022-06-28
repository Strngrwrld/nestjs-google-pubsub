import { Message } from '@google-cloud/pubsub';
import { BaseRpcContext } from '@nestjs/microservices/ctx-host/base-rpc.context';

export class GooglePubSubContext extends BaseRpcContext<[Message, string]> {
  constructor(args: [Message, string]) {
    super(args);
  }

  /**
   * Returns the original message (with properties, fields, and content).
   */
  get message(): Message {
    return this.args[0];
  }

  /**
   * Returns the name of the pattern.
   */
  get pattern(): string {
    return this.args[1];
  }
}
