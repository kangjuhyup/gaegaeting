import { ValueTransformer } from 'typeorm';

/**
 * Value 기반 Enum 변환기
 * 
 * TypeORM에서 { label, value } 형태의 enum을 tinyint로 저장하고 불러올 때 사용하는 변환기입니다.
 * 데이터베이스에는 value(숫자)로 저장하고, 애플리케이션에서는 enum 객체를 사용합니다.
 * 
 * @template T enum 타입 ({ label: string, value: number } 형태)
 */
export class ValueEnumTransformer<T extends Record<string, { label: string; value: number }>> implements ValueTransformer {
  /**
   * enum 객체
   */
  private readonly enumObject: T;

  /**
   * value를 키로 하는 맵 (빠른 조회를 위해)
   */
  private readonly valueMap: Map<number, T[keyof T]>;

  /**
   * 생성자
   * @param enumObject enum 객체
   */
  constructor(enumObject: T) {
    this.enumObject = enumObject;
    this.valueMap = new Map();
    
    // value를 키로 하는 맵 생성
    Object.values(enumObject).forEach((enumValue) => {
      if (enumValue && typeof enumValue === 'object' && 'value' in enumValue) {
        this.valueMap.set(enumValue.value, enumValue as T[keyof T]);
      }
    });
  }

  /**
   * 엔티티 값을 데이터베이스 값으로 변환
   * @param value enum 객체 또는 number
   * @returns 데이터베이스에 저장할 숫자 값
   */
  to(value: T[keyof T] | number | null | undefined): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    
    // 이미 number인 경우
    if (typeof value === 'number') {
      return value;
    }
    
    // enum 객체인 경우 value 추출
    if (typeof value === 'object' && 'value' in value) {
      return value.value;
    }
    
    return null;
  }

  /**
   * 데이터베이스 값을 엔티티 값으로 변환
   * @param value 데이터베이스에서 불러온 숫자 값
   * @returns enum 객체
   */
  from(value: number | null | undefined): T[keyof T] | null {
    if (value === undefined || value === null) {
      return null;
    }
    
    // value에 해당하는 enum 객체 반환
    return this.valueMap.get(value) || null;
  }
}

