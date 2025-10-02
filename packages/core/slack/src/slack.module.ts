import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SlackService, SlackConfig } from './service/slack.service';

@Module({})
export class SlackModule {
  static forRoot(config: SlackConfig): DynamicModule {
    return {
      module: SlackModule,
      imports: [HttpModule],
      providers: [
        {
          provide: 'SLACK_CONFIG',
          useValue: config,
        },
        {
          provide: SlackService,
          useFactory: (httpService: any) => {
            return new SlackService(httpService, config);
          },
          inject: [HttpModule],
        },
      ],
      exports: [SlackService],
      global: true,
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory?: (...args: any[]) => Promise<SlackConfig> | SlackConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SlackModule,
      imports: [HttpModule, ...(options.imports || [])],
      providers: [
        {
          provide: 'SLACK_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: SlackService,
          useFactory: (httpService: any, config: SlackConfig) => {
            return new SlackService(httpService, config);
          },
          inject: [HttpModule, 'SLACK_CONFIG'],
        },
      ],
      exports: [SlackService],
      global: true,
    };
  }
}