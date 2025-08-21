/**
 * 일자 단위 타입 (일, 월, 주 등)
 */
export type DateUnit = 'day' | 'month' | 'year' | 'week';

/**
 * YYYYMMDD 형식의 날짜를 처리하는 클래스
 * 메서드 체이닝을 지원하여 date.toDate(), date.add(1, 'day') 등의 사용이 가능
 */
export class YYYYMMDD {
    // YYYYMMDD 형식의 문자열 타입 검증을 위한 정규표현식
    static readonly REGEX = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
    
    private readonly value: string;

    /**
     * YYYYMMDD 클래스 생성자
     * @param value YYYYMMDD 형식의 문자열 또는 Date 객체
     */
    constructor(value: string | Date) {
        if (value instanceof Date) {
            this.value = YYYYMMDD.fromDate(value);
        } else {
            if (!YYYYMMDD.isValid(value)) {
                throw new Error(`유효하지 않은 YYYYMMDD 형식입니다: ${value}`);
            }
            this.value = value;
        }
    }

    /**
     * 현재 한국 날짜를 YYYYMMDD 형식으로 반환
     */
    static today(): YYYYMMDD {
        return new YYYYMMDD(KrDateClass.now());
    }

    /**
     * Date 객체를 YYYYMMDD 형식의 문자열로 변환
     */
    static fromDate(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * 문자열이 유효한 YYYYMMDD 형식인지 검증
     */
    static isValid(dateStr: string): boolean {
        if (!YYYYMMDD.REGEX.test(dateStr)) {
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
     * 문자열 값 반환
     */
    toString(): string {
        return this.value;
    }

    /**
     * Date 객체로 변환
     */
    toDate(): Date {
        const year = parseInt(this.value.substring(0, 4));
        const month = parseInt(this.value.substring(4, 6)) - 1; // JavaScript의 월은 0부터 시작
        const day = parseInt(this.value.substring(6, 8));
        
        return new Date(year, month, day);
    }

    /**
     * 일수/월/년도 추가
     * @param value 추가할 값
     * @param unit 단위 ('day', 'month', 'year', 'week')
     */
    add(value: number, unit: DateUnit): YYYYMMDD {
        const date = this.toDate();
        
        switch(unit) {
            case 'day':
                date.setDate(date.getDate() + value);
                break;
            case 'month':
                date.setMonth(date.getMonth() + value);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() + value);
                break;
            case 'week':
                date.setDate(date.getDate() + (value * 7));
                break;
        }
        
        return new YYYYMMDD(date);
    }

    /**
     * 일수/월/년도 차감
     * @param value 차감할 값
     * @param unit 단위 ('day', 'month', 'year', 'week')
     */
    subtract(value: number, unit: DateUnit): YYYYMMDD {
        return this.add(-value, unit);
    }

    /**
     * 두 날짜 사이의 일수 차이 계산
     */
    daysBetween(other: YYYYMMDD): number {
        const oneDay = 24 * 60 * 60 * 1000; // 하루를 밀리초로 표현
        const date1 = this.toDate();
        const date2 = other.toDate();
        
        const utcDate1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const utcDate2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
        
        return Math.floor(Math.abs((utcDate1 - utcDate2) / oneDay));
    }

    /**
     * 두 날짜의 동일 여부 확인
     */
    equals(other: YYYYMMDD): boolean {
        return this.value === other.toString();
    }

    /**
     * 현재 날짜가 매개변수로 주어진 날짜보다 이후인지 확인
     */
    isAfter(other: YYYYMMDD): boolean {
        return this.value > other.toString();
    }

    /**
     * 현재 날짜가 매개변수로 주어진 날짜보다 이전인지 확인
     */
    isBefore(other: YYYYMMDD): boolean {
        return this.value < other.toString();
    }

    /**
     * 형식화된 날짜 문자열 반환 (YYYY-MM-DD)
     */
    format(separator: string = '-'): string {
        const year = this.value.substring(0, 4);
        const month = this.value.substring(4, 6);
        const day = this.value.substring(6, 8);
        
        return `${year}${separator}${month}${separator}${day}`;
    }
}

/**
 * KrDateClass - 한국 시간(KST) 관련 유틸리티 클래스
 * 한국 시간 기준으로 날짜와 시간을 처리하는 다양한 정적 메서드 제공
 */
export class KrDateClass {
    // YYYYMMDD 클래스의 정규표현식 사용
    static readonly YYYYMMDD_REGEX = YYYYMMDD.REGEX;
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
     * 현재 한국 날짜를 YYYYMMDD 형식으로 반환
     */
    static toYYYYMMDD(): YYYYMMDD {
        return YYYYMMDD.today();
    }

    /**
     * 주어진 Date 객체를 YYYYMMDD 형식으로 변환
     */
    static dateToYYYYMMDD(date: Date): YYYYMMDD {
        return new YYYYMMDD(date);
    }

    /**
     * YYYYMMDD 형식을 Date 객체로 변환
     * @throws 유효하지 않은 YYYYMMDD 형식일 경우 예외 발생
     */
    static parseYYYYMMDD(dateStr: string | YYYYMMDD): Date {
        if (dateStr instanceof YYYYMMDD) {
            return dateStr.toDate();
        }
        
        if (!this.isValidYYYYMMDD(dateStr)) {
            throw new Error(`유효하지 않은 YYYYMMDD 형식입니다: ${dateStr}`);
        }
        
        return new YYYYMMDD(dateStr).toDate();
    }

    /**
     * 주어진 문자열이 유효한 YYYYMMDD 형식인지 검증
     */
    static isValidYYYYMMDD(dateStr: string): boolean {
        return YYYYMMDD.isValid(dateStr);
    }

    /**
     * YYYYMMDD 형식에 일수 추가
     */
    static addDaysToYYYYMMDD(dateStr: string | YYYYMMDD, days: number): YYYYMMDD {
        if (dateStr instanceof YYYYMMDD) {
            return dateStr.add(days, 'day');
        }
        return new YYYYMMDD(dateStr).add(days, 'day');
    }

    /**
     * 두 YYYYMMDD 형식 사이의 일수 차이 계산
     */
    static daysBetweenYYYYMMDD(dateStr1: string | YYYYMMDD, dateStr2: string | YYYYMMDD): number {
        const date1 = dateStr1 instanceof YYYYMMDD ? dateStr1 : new YYYYMMDD(dateStr1);
        const date2 = dateStr2 instanceof YYYYMMDD ? dateStr2 : new YYYYMMDD(dateStr2);
        return date1.daysBetween(date2);
    }
}
