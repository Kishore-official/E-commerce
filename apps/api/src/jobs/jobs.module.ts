import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUES } from './queues';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.SEARCH_INDEX },
      { name: QUEUES.EMAIL },
      { name: QUEUES.ORDER_EVENTS },
      { name: QUEUES.PAYMENT_EVENTS },
      { name: QUEUES.LOGISTICS_EVENTS },
      { name: QUEUES.AFFILIATE_EVENTS },
      { name: QUEUES.REVIEW_CRON },
      { name: QUEUES.CART_CRON },
      { name: QUEUES.AUDIT },
    ),
  ],
  exports: [BullModule],
})
export class JobsModule {}
