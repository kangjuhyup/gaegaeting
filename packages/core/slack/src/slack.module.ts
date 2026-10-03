import { Module, type DynamicModule } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { SlackService, type SlackConfig } from './service/slack.service.js';

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
          useFactory: (httpService: HttpService) => {
            return new SlackService(httpService, config);
          },
          inject: [HttpService],
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
          useFactory: (httpService: HttpService, config: SlackConfig) => {
            return new SlackService(httpService, config);
          },
          inject: [HttpService, 'SLACK_CONFIG'],
        },
      ],
      exports: [SlackService],
      global: true,
    };
  }
}
