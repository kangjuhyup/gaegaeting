import { ClockPort } from '@app/feed/application/port/clock.port';
import { KrDateClass } from '@core/util';
import { Injectable } from '@nestjs/common';

/**
 * 기본 Clock 구현: 한국 시간(KST) 기준 now() 제공
 * - YYYYMMDD.today()가 내부적으로 KrDateClass.now()를 쓰는 것과 동일한 기준
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return KrDateClass.now();
  }
}


