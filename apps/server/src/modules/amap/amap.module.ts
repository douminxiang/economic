import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AmapService } from './amap.service';
import { AmapController } from './amap.controller';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [AmapController],
  providers: [AmapService],
  exports: [AmapService],
})
export class AmapModule {}
