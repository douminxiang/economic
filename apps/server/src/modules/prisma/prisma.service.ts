import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/** MySQL session timezone for DATETIME fields (e.g. track_events.createdAt). */
const DB_TIMEZONE = process.env.DB_TIMEZONE || '+08:00';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/economic';
    const url = new URL(dbUrl);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
      // Every pooled connection uses Beijing time for NOW() / CURRENT_TIMESTAMP.
      initSql: `SET time_zone = '${DB_TIMEZONE}'`,
      timezone: DB_TIMEZONE,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`SET time_zone = '${DB_TIMEZONE}'`);
    this.logger.log(`Database session timezone set to ${DB_TIMEZONE}`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
