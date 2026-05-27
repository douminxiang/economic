import { Controller, Post, Get, Delete, Body, Query } from '@nestjs/common';
import { BrowseHistoryService } from './browse-history.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('browse-history')
export class BrowseHistoryController {
  constructor(private service: BrowseHistoryService) {}

  @Post('record')
  async record(@CurrentUser() user: any, @Body() body: { shopId: number }) {
    await this.service.record(user.id, body.shopId);
    return { ok: true };
  }

  @Get()
  async getHistory(@CurrentUser() user: any, @Query('group') group: string) {
    return this.service.getHistory(user.id, (group || 'today') as any);
  }

  @Delete()
  async deleteAll(@CurrentUser() user: any) {
    await this.service.deleteAll(user.id);
    return { ok: true };
  }
}
