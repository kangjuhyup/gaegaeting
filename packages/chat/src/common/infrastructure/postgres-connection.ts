import { Pool, type PoolClient } from 'pg';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readDatabaseConnectionOptions } from '@core/database';

@Injectable()
export class ChatPostgresConnection {
  readonly pool: Pool;
  private readonly logger = new Logger(ChatPostgresConnection.name);
  constructor(config: ConfigService) {
    this.pool = new Pool({ ...readDatabaseConnectionOptions(config), max: 10,
      connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    this.pool.on('error', () => this.logger.error('채팅 DB 연결 오류'));
  }
  async onModuleDestroy() { await this.pool.end(); }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('begin'); const result = await work(client); await client.query('commit'); return result; }
    catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
}
