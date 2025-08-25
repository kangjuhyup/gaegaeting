import { ValueTransformer } from 'typeorm';

/**
 * bigint <-> string 변환 Transformer
 * DB에서 불러올 땐 string -> BigInt,
 * 저장할 땐 BigInt -> string 으로 변환
 */
export const BigIntStringTransformer: ValueTransformer = {
  to: (value?: bigint | string): string | null => {
    if (value === undefined || value === null) return null;
    return typeof value === 'bigint' ? value.toString() : value;
  },
  from: (value: string | null): bigint | null => {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' ? BigInt(value) : (value as any);
  },
};