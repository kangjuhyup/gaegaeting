import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SlackMessage, SlackAttachment, SlackColor, SlackField } from '../interface/slack-message.interface';

export interface SlackConfig {
  webhookUrl: string;
  defaultChannel?: string;
  defaultUsername?: string;
  defaultIconEmoji?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: SlackConfig
  ) {}

  /**
   * Slack에 메시지를 전송합니다
   */
  async sendMessage(message: SlackMessage): Promise<void> {
    try {
      const payload = this.buildPayload(message);
      
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(this.config.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })
      );

      if (response.status === 200) {
        this.logger.log('Slack message sent successfully');
      } else {
        this.logger.warn(`Slack API returned status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Failed to send Slack message', error.stack);
      throw new Error('Failed to send Slack message');
    }
  }

  /**
   * 간단한 텍스트 메시지를 전송합니다
   */
  async sendText(text: string, channel?: string): Promise<void> {
    await this.sendMessage({
      text,
      channel
    });
  }

  /**
   * 성공 메시지를 전송합니다
   */
  async sendSuccess(title: string, text: string, fields?: SlackField[]): Promise<void> {
    await this.sendMessage({
      attachments: [{
        color: SlackColor.SUCCESS,
        title: `✅ ${title}`,
        text,
        fields,
        footer: 'Gaegaeting',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  /**
   * 경고 메시지를 전송합니다
   */
  async sendWarning(title: string, text: string, fields?: SlackField[]): Promise<void> {
    await this.sendMessage({
      attachments: [{
        color: SlackColor.WARNING,
        title: `⚠️ ${title}`,
        text,
        fields,
        footer: 'Gaegaeting',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  /**
   * 에러 메시지를 전송합니다
   */
  async sendError(title: string, error: Error | string, context?: Record<string, any>): Promise<void> {
    const errorText = error instanceof Error ? error.message : error;
    const fields: SlackField[] = [];

    if (error instanceof Error && error.stack) {
      fields.push({
        title: 'Stack Trace',
        value: `\`\`\`${error.stack.substring(0, 500)}${error.stack.length > 500 ? '...' : ''}\`\`\``,
        short: false
      });
    }

    if (context) {
      fields.push({
        title: 'Context',
        value: `\`\`\`${JSON.stringify(context, null, 2)}\`\`\``,
        short: false
      });
    }

    await this.sendMessage({
      attachments: [{
        color: SlackColor.DANGER,
        title: `🚨 ${title}`,
        text: errorText,
        fields,
        footer: 'Gaegaeting',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  /**
   * 정보 메시지를 전송합니다
   */
  async sendInfo(title: string, text: string, fields?: SlackField[]): Promise<void> {
    await this.sendMessage({
      attachments: [{
        color: SlackColor.INFO,
        title: `ℹ️ ${title}`,
        text,
        fields,
        footer: 'Gaegaeting',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  /**
   * 배포 알림을 전송합니다
   */
  async sendDeployment(version: string, environment: string, changes?: string[]): Promise<void> {
    const fields: SlackField[] = [
      {
        title: 'Version',
        value: version,
        short: true
      },
      {
        title: 'Environment',
        value: environment,
        short: true
      }
    ];

    if (changes && changes.length > 0) {
      fields.push({
        title: 'Changes',
        value: changes.map(change => `• ${change}`).join('\n'),
        short: false
      });
    }

    await this.sendMessage({
      attachments: [{
        color: SlackColor.PRIMARY,
        title: '🚀 Deployment Complete',
        text: `Successfully deployed to ${environment}`,
        fields,
        footer: 'Gaegaeting Deploy',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  /**
   * 메트릭 알림을 전송합니다
   */
  async sendMetrics(title: string, metrics: Record<string, string | number>): Promise<void> {
    const fields: SlackField[] = Object.entries(metrics).map(([key, value]) => ({
      title: key,
      value: value.toString(),
      short: true
    }));

    await this.sendMessage({
      attachments: [{
        color: SlackColor.INFO,
        title: `📊 ${title}`,
        fields,
        footer: 'Gaegaeting Metrics',
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  }

  private buildPayload(message: SlackMessage): SlackMessage {
    return {
      username: this.config.defaultUsername,
      icon_emoji: this.config.defaultIconEmoji,
      channel: this.config.defaultChannel,
      ...message
    };
  }
}