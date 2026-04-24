import { Global, Module } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';

export const JOB_QUEUE = 'JOB_QUEUE';

/**
 * V3r — Global queue module. One token (`JOB_QUEUE`) so consumers don't
 * depend on the concrete implementation. Swap `useClass` for a future
 * BullMQ service without touching any call site.
 */
@Global()
@Module({
  providers: [
    InMemoryQueueService,
    { provide: JOB_QUEUE, useExisting: InMemoryQueueService },
  ],
  exports: [JOB_QUEUE, InMemoryQueueService],
})
export class QueueModule {}
