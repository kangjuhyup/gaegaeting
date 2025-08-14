import { ValueTransformer } from 'typeorm';

/**
 * Enum 값 변환기
 * 
 * TypeORM에서 enum 타입을 tinyint로 저장하고 불러올 때 사용하는 변환기입니다.
 * 데이터베이스에는 숫자(tinyint)로 저장하고, 애플리케이션에서는 enum 타입으로 사용합니다.
 * 
 * @template T enum 타입
 */
export class EnumTransformer<T extends Record<string, any>> implements ValueTransformer {
  /**
   * enum 객체와 enum 값 배열
   */
  private readonly enumObject: T;
  private readonly enumValues: any[];

  /**
   * 생성자
   * @param enumObject enum 객체
   */
  constructor(enumObject: T) {
    this.enumObject = enumObject;
    this.enumValues = Object.values(enumObject);
  }

  /**
   * 엔티티 값을 데이터베이스 값으로 변환
   * @param value enum 값
   * @returns 데이터베이스에 저장할 숫자 값
   */
  to(value: any): number {
    if (value === undefined || value === null) {
      return null;
    }
    
    // enum 값의 인덱스를 찾아 반환
    return this.enumValues.indexOf(value);
  }

  /**
   * 데이터베이스 값을 엔티티 값으로 변환
   * @param value 데이터베이스에서 불러온 숫자 값
   * @returns enum 값
   */
  from(value: number): any {
    if (value === undefined || value === null) {
      return null;
    }
    
    // 인덱스에 해당하는 enum 값 반환
    return this.enumValues[value];
  }
}
