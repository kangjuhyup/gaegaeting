import { YYYYMMDD } from "./date.type";

/**
 * KrDateClass - 한국 시간(KST) 관련 유틸리티 클래스
 * 한국 시간 기준으로 날짜와 시간을 처리하는 다양한 정적 메서드 제공
 */
export class KrDateClass {
    // YYYYMMDD 형식의 문자열 타입 검증을 위한 정규표현식
    static readonly YYYYMMDD_REGEX = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
    // KST 시간대 오프셋 (UTC+9)
    private static readonly KST_OFFSET = 9 * 60 * 60 * 1000;

    /**
     * 현재 한국 시간 기준 Date 객체 반환
     */
    static now(): Date {
        return new Date(new Date().getTime() + this.getTimezoneOffset());
    }

    /**
     * 현재 시간대와 KST의 시간 차이를 밀리초로 반환
     */
    private static getTimezoneOffset(): number {
        const localOffset = new Date().getTimezoneOffset() * 60 * 1000;
        return localOffset + this.KST_OFFSET;
    }

    /**
     * 현재 한국 날짜 정보 반환 (년, 월, 일)
     */
    static today() {
        const date = this.now();
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }

    /**
     * 현재 한국 시간 정보 반환 (시, 분, 초)
     */
    static time() {
        const date = this.now();
        return {
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds()
        };
    }

    /**
     * 현재 한국 날짜를 YYYY-MM-DD 형식의 문자열로 반환
     */
    static formatDate(separator: string = '-'): string {
        const { year, month, day } = this.today();
        return `${year}${separator}${month.toString().padStart(2, '0')}${separator}${day.toString().padStart(2, '0')}`;
    }

    /**
     * 현재 한국 시간을 HH:MM:SS 형식의 문자열로 반환
     */
    static formatTime(separator: string = ':'): string {
        const { hour, minute, second } = this.time();
        return `${hour.toString().padStart(2, '0')}${separator}${minute.toString().padStart(2, '0')}${separator}${second.toString().padStart(2, '0')}`;
    }

    /**
     * 현재 한국 날짜와 시간을 YYYY-MM-DD HH:MM:SS 형식의 문자열로 반환
     */
    static formatDateTime(): string {
        return `${this.formatDate()} ${this.formatTime()}`;
    }

    /**
     * 주어진 날짜가 오늘(한국 시간 기준)인지 확인
     */
    static isToday(date: Date): boolean {
        const today = this.today();
        return (
            date.getFullYear() === today.year &&
            date.getMonth() + 1 === today.month &&
            date.getDate() === today.day
        );
    }

    /**
     * 한국 시간 기준으로 특정 일수를 더하거나 뺀 Date 객체 반환
     */
    static addDays(days: number): Date {
        const date = this.now();
        date.setDate(date.getDate() + days);
        return date;
    }

    /**
     * 두 날짜 사이의 일수 차이 계산 (한국 시간 기준)
     */
    static daysBetween(date1: Date, date2: Date): number {
        const oneDay = 24 * 60 * 60 * 1000; // 하루를 밀리초로 표현
        const utcDate1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const utcDate2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return Math.floor(Math.abs((utcDate1 - utcDate2) / oneDay));
    }

    /**
     * 현재 한국 날짜를 YYYYMMDD 형식의 문자열로 반환
     */
    static toYYYYMMDD(): YYYYMMDD {
        const { year, month, day } = this.today();
        return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
    }

    /**
     * 주어진 Date 객체를 YYYYMMDD 형식의 문자열로 변환
     */
    static dateToYYYYMMDD(date: Date): YYYYMMDD {
        return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    }

    /**
     * YYYYMMDD 형식의 문자열을 Date 객체로 변환
     * @throws 유효하지 않은 YYYYMMDD 형식일 경우 예외 발생
     */
    static parseYYYYMMDD(dateStr: YYYYMMDD): Date {
        if (!this.isValidYYYYMMDD(dateStr)) {
            throw new Error(`유효하지 않은 YYYYMMDD 형식입니다: ${dateStr}`);
        }
        
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // JavaScript의 월은 0부터 시작
        const day = parseInt(dateStr.substring(6, 8));
        
        return new Date(year, month, day);
    }

    /**
     * 주어진 문자열이 유효한 YYYYMMDD 형식인지 검증
     */
    static isValidYYYYMMDD(dateStr: string): boolean {
        if (!this.YYYYMMDD_REGEX.test(dateStr)) {
            return false;
        }
        
        // 추가 유효성 검사 (예: 2월 30일 같은 존재하지 않는 날짜 검증)
        try {
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1;
            const day = parseInt(dateStr.substring(6, 8));
            
            const date = new Date(year, month, day);
            return date.getFullYear() === year && 
                   date.getMonth() === month && 
                   date.getDate() === day;
        } catch (e) {
            return false;
        }
    }

    /**
     * YYYYMMDD 형식의 문자열에 일수 추가
     */
    static addDaysToYYYYMMDD(dateStr: YYYYMMDD, days: number): YYYYMMDD {
        const date = this.parseYYYYMMDD(dateStr);
        date.setDate(date.getDate() + days);
        return this.dateToYYYYMMDD(date);
    }

    /**
     * 두 YYYYMMDD 형식 문자열 사이의 일수 차이 계산
     */
    static daysBetweenYYYYMMDD(dateStr1: YYYYMMDD, dateStr2: YYYYMMDD): number {
        const date1 = this.parseYYYYMMDD(dateStr1);
        const date2 = this.parseYYYYMMDD(dateStr2);
        return this.daysBetween(date1, date2);
    }
}