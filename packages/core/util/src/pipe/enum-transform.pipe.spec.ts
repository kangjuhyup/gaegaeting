import { EnumTransformPipe } from './enum-transform.pipe';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

// 테스트용 열거형 정의
enum TestEnum {
  ONE = 1,
  TWO = 2,
  THREE = 3
}

// 테스트용 DTO 클래스 정의
class TestDto {
  @EnumTransformPipe(TestEnum)
  value: TestEnum;
}

// 배열 테스트용 DTO 클래스 정의
class TestArrayDto {
  @EnumTransformPipe(TestEnum)
  values: TestEnum[];
}

// 커스텀 에러 메시지 테스트용 DTO 클래스 정의
class TestCustomErrorDto {
  @EnumTransformPipe(TestEnum, '커스텀 에러 메시지')
  value: TestEnum;
}

describe('EnumTransformPipe 단위 테스트', () => {
  
  // Transform 데코레이터 기능 테스트
  describe('Transform 데코레이터 기능', () => {
    it('문자열 키를 해당 열거형 값으로 변환해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'ONE' });
      
      // When & Then
      expect(dto.value).toBe(TestEnum.ONE);
    });
    
    it('대소문자 구분 없이 변환해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'one' });
      
      // When & Then
      expect(dto.value).toBe(TestEnum.ONE);
    });
    
    it('유효하지 않은 문자열은 원래 값을 유지해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'INVALID' });
      
      // When & Then
      expect(dto.value).toBe('INVALID');
    });
    
    it('숫자 값은 변환하지 않고 그대로 유지해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 1 });
      
      // When & Then
      expect(dto.value).toBe(1);
    });
  });
  
  // ValidateBy 데코레이터 기능 테스트
  describe('ValidateBy 데코레이터 기능', () => {
    it('유효한 열거형 문자열 키는 검증을 통과해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'ONE' });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors.length).toBe(0);
    });
    
    it('유효한 열거형 값은 검증을 통과해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 1 });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors.length).toBe(0);
    });
    
    it('유효하지 않은 문자열은 검증에 실패해야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'INVALID' });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isValidEnum');
      expect(errors[0].constraints.isValidEnum).toBe('유효하지 않은 값입니다.');
    });
  });
  
  // 배열 값 처리 테스트
  describe('배열 값 처리', () => {
    it('문자열 배열을 열거형 배열로 변환해야 함', () => {
      // Given
      const dto = plainToClass(TestArrayDto, { values: ['ONE', 'TWO', 'THREE'] });
      
      // When & Then
      expect(dto.values).toEqual([TestEnum.ONE, TestEnum.TWO, TestEnum.THREE]);
    });
    
    it('대소문자 구분 없이 배열 값을 변환해야 함', () => {
      // Given
      const dto = plainToClass(TestArrayDto, { values: ['one', 'Two', 'THREE'] });
      
      // When & Then
      expect(dto.values).toEqual([TestEnum.ONE, TestEnum.TWO, TestEnum.THREE]);
    });
    
    it('유효하지 않은 배열 값이 있으면 검증에 실패해야 함', () => {
      // Given
      const dto = plainToClass(TestArrayDto, { values: ['ONE', 'INVALID', 'THREE'] });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  
  // 오류 메시지 처리 테스트
  describe('오류 메시지 처리', () => {
    it('기본 오류 메시지가 표시되어야 함', () => {
      // Given
      const dto = plainToClass(TestDto, { value: 'INVALID' });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors[0].constraints.isValidEnum).toBe('유효하지 않은 값입니다.');
    });
    
    it('커스텀 오류 메시지가 표시되어야 함', () => {
      // Given
      const dto = plainToClass(TestCustomErrorDto, { value: 'INVALID' });
      
      // When
      const errors = validateSync(dto);
      
      // Then
      expect(errors[0].constraints.isValidEnum).toBe('커스텀 에러 메시지');
    });
  });
});