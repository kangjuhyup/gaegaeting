import { Transform } from 'class-transformer';
import { ValidateBy } from 'class-validator';

/**
 * 열거형 값을 변환하고 검증하는 파이프
 * @param enumType 변환할 열거형 타입
 * @param errorMessage 유효성 검증 실패 시 표시할 오류 메시지
 * @returns 데코레이터 함수
 */
export function EnumTransformPipe<T extends Record<string, any>>(
  enumType: T,
  errorMessage: string = '유효하지 않은 값입니다.'
) {
  // Transform 데코레이터: 문자열을 열거형 객체로 변환
  const transformDecorator = Transform(({ value }) => {
    // 배열인 경우 각 요소를 순환하여 처리
    if (Array.isArray(value)) {
      return value.map(item => transformEnumValue(item, enumType));
    }
    
    // 단일 값인 경우 직접 처리
    return transformEnumValue(value, enumType);
  });

  // ValidateBy 데코레이터: 값이 유효한 열거형인지 검증
  const validateDecorator = ValidateBy({
    name: 'isValidEnum',
    validator: {
      validate: (value) => {
        // 배열인 경우 각 요소를 검증
        if (Array.isArray(value)) {
          return value.every(item => validateEnumValue(item, enumType));
        }
        
        // 단일 값인 경우 직접 검증
        return validateEnumValue(value, enumType);
      },
      defaultMessage: () => errorMessage
    }
  });

  // 두 데코레이터를 함께 적용하는 함수 반환
  return function(target: any, propertyKey: string) {
    transformDecorator(target, propertyKey);
    validateDecorator(target, propertyKey);
  };
}

/**
 * 열거형 값을 변환하는 헬퍼 함수
 * @param value 변환할 값
 * @param enumType 열거형 타입
 * @returns 변환된 열거형 값
 */
function transformEnumValue<T extends Record<string, any>>(value: any, enumType: T): any {
  if (typeof value !== 'string') return value;
  
  const lowerValue = value.toLowerCase();
  
  const enumEntries = Object.entries(enumType)
    .filter(([key]) => key !== 'from' && typeof key === 'string')
    .map(([key, val]) => [key.toLowerCase(), val]);
  
  const supportedValues = Object.fromEntries(enumEntries);
  
  if (lowerValue in supportedValues) {
    return supportedValues[lowerValue];
  }
  
  return value;
}

/**
 * 열거형 값을 검증하는 헬퍼 함수
 * @param value 검증할 값
 * @param enumType 열거형 타입
 * @returns 검증 결과
 */
function validateEnumValue<T extends Record<string, any>>(value: any, enumType: T): boolean {
  if (typeof value !== 'string') return true;
  
  const enumLabels = Object.entries(enumType)
    .filter(([key]) => key !== 'from')
    .map(([key]) => key.toLowerCase());
    
  return enumLabels.includes(value.toLowerCase());
}
