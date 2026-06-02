import { Module, forwardRef } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentModule } from '../payment/payment.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => PaymentModule), forwardRef(() => EventsModule)],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
