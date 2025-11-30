import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsApiPort } from '../../application/port/sms-api.port';
import * as crypto from 'crypto';
import * as https from 'https';
import { ENV_KEY } from '../../common/config/env.config';

@Injectable()
export class NaverCloudApiAdapter extends SmsApiPort {
  constructor(private readonly configService: ConfigService) { super(); }

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    const accessKey = this.configService.get<string>(ENV_KEY.NAVER_CLOUD_ACCESS_KEY);
    const secretKey = this.configService.get<string>(ENV_KEY.NAVER_CLOUD_SECRET_KEY);
    const serviceId = this.configService.get<string>(ENV_KEY.NAVER_CLOUD_SMS_SERVICE_ID); // SENS serviceId
    const fromNumber = this.configService.get<string>(ENV_KEY.NAVER_CLOUD_SMS_SENDER); // registered sender number

    if (!accessKey || !secretKey || !serviceId || !fromNumber) {
      throw new InternalServerErrorException('Naver Cloud SMS credentials are not configured');
    }

    const host = 'sens.apigw.ntruss.com';
    const path = `/sms/v2/services/${serviceId}/messages`;
    const method = 'POST';
    const timestamp = Date.now().toString();
    const url = `https://${host}${path}`;

    const signature = this.makeSignature({ method, path, timestamp, accessKey, secretKey });

    const to = this.normalizePhone(phoneNumber);
    const body = JSON.stringify({
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: fromNumber,
      content: message,
      messages: [{ to, content: message }],
    });

    await this.request({
      host,
      path,
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body,
      url,
    });
  }

  private makeSignature(params: { method: string; path: string; timestamp: string; accessKey: string; secretKey: string }): string {
    const { method, path, timestamp, accessKey, secretKey } = params;
    const space = ' ';
    const newLine = '\n';
    const message = [method, space, path, newLine, timestamp, newLine, accessKey].join('');
    const hmac = crypto.createHmac('sha256', secretKey);
    return hmac.update(message).digest('base64');
  }

  private normalizePhone(phone: string): string {
    // Strip non-digits; assume KR numbers and SENS countryCode '82'
    return phone.replace(/\D/g, '');
  }

  private request(opts: { host: string; path: string; method: string; headers: Record<string, string>; body: string; url: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        host: opts.host,
        path: opts.path,
        method: opts.method,
        headers: {
          ...opts.headers,
          'Content-Length': Buffer.byteLength(opts.body).toString(),
        },
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          const text = Buffer.concat(chunks).toString('utf8');
          if (status >= 200 && status < 300) {
            return resolve();
          }
          return reject(new Error(`Naver SMS API error: ${status} ${text}`));
        });
      });
      req.on('error', reject);
      req.write(opts.body);
      req.end();
    });
  }
}


