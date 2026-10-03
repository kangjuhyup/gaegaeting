import { ClockPort } from '#app/feed/application/port/clock.port';
import { Injectable } from '@nestjs/common';

/**
 * 실제 현재 시각을 제공한다. 한국 시간대 계산은 일일 추천 정책에서 처리한다.
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}


