import { ValueTransformer } from 'typeorm';

/**
 * tinyint(0/1) <-> boolean 변환 Transformer
 * - MySQL의 tinyint(1)이 런타임에서 0/1로 내려오는 경우를 boolean으로 정규화합니다.
 * - 저장 시엔 truthy -> 1, falsy -> 0 으로 저장합니다.
 */
export const Boolean01Transformer: ValueTransformer = {
  to: (value?: boolean | 0 | 1 | null): 0 | 1 | null => {
    if (value === undefined || value === null) return null;
    return value === true || value === 1 ? 1 : 0;
  },
  from: (value: any): boolean => {
    return value === true || value === 1 || value === '1';
  },
};


