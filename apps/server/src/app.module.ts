import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AddressModule } from './modules/address/address.module';
import { CategoryModule } from './modules/category/category.module';
import { ShopModule } from './modules/shop/shop.module';
import { ProductModule } from './modules/product/product.module';
import { AmapModule } from './modules/amap/amap.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { ReviewModule } from './modules/review/review.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { AiModule } from './modules/ai/ai.module';
import { BrowseHistoryModule } from './modules/browse-history/browse-history.module';
import { UploadModule } from './modules/upload/upload.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentModule } from './modules/payment/payment.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PrismaModule,
    AuthModule,
    UserModule,
    AddressModule,
    CategoryModule,
    ShopModule,
    ProductModule,
    AmapModule,
    CartModule,
    OrderModule,
    ReviewModule,
    FavoriteModule,
    AiModule,
    BrowseHistoryModule,
    UploadModule,
    AnalyticsModule,
    PaymentModule,
    EventsModule,
  ],
})
export class AppModule {}
