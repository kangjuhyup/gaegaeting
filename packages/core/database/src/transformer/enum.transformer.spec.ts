import { EnumTransformer } from './enum.transformer';

/**
 * 테스트용 enum 정의
 */
enum TestEnum {
  FIRST = 'FIRST',
  SECOND = 'SECOND',
  THIRD = 'THIRD',
}

describe('EnumTransformer', () => {
  let transformer: EnumTransformer<typeof TestEnum>;

  beforeEach(() => {
    transformer = new EnumTransformer(TestEnum);
  });

  describe('to 메서드', () => {
    it('enum 값을 숫자 인덱스로 변환해야 함', () => {
      // given
      const enumValue = TestEnum.FIRST;
      
      // when
      const result = transformer.to(enumValue);
      
      // then
      expect(result).toBe(0); // FIRST는 첫 번째 값이므로 인덱스 0
    });

    it('두 번째 enum 값을 숫자 인덱스로 변환해야 함', () => {
      // given
      const enumValue = TestEnum.SECOND;
      
      // when
      const result = transformer.to(enumValue);
      
      // then
      expect(result).toBe(1); // SECOND는 두 번째 값이므로 인덱스 1
    });

    it('null 값을 null로 변환해야 함', () => {
      // given
      const enumValue = null;
      
      // when
      const result = transformer.to(enumValue);
      
      // then
      expect(result).toBeNull();
    });

    it('undefined 값을 null로 변환해야 함', () => {
      // given
      const enumValue = undefined;
      
      // when
      const result = transformer.to(enumValue);
      
      // then
      expect(result).toBeNull();
    });
  });

  describe('from 메서드', () => {
    it('숫자 인덱스를 enum 값으로 변환해야 함', () => {
      // given
      const dbValue = 0;
      
      // when
      const result = transformer.from(dbValue);
      
      // then
      expect(result).toBe(TestEnum.FIRST);
    });

    it('두 번째 숫자 인덱스를 enum 값으로 변환해야 함', () => {
      // given
      const dbValue = 1;
      
      // when
      const result = transformer.from(dbValue);
      
      // then
      expect(result).toBe(TestEnum.SECOND);
    });

    it('null 값을 null로 변환해야 함', () => {
      // given
      const dbValue = null;
      
      // when
      const result = transformer.from(dbValue);
      
      // then
      expect(result).toBeNull();
    });

    it('undefined 값을 null로 변환해야 함', () => {
      // given
      const dbValue = undefined;
      
      // when
      const result = transformer.from(dbValue);
      
      // then
      expect(result).toBeNull();
    });
  });
});
