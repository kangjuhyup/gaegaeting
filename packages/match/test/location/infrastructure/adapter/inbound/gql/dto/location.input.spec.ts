import { validateSync } from 'class-validator';
import {
  SetLocationInput,
  SetMainAreaInput,
} from '@app/location/infrastructure/adapter/inbound/gql/dto/location.input';

describe('location.input.ts DTOs (UNIT)', () => {
  describe('SetMainAreaInput', () => {
    it('code가 2자리면 통과한다', () => {
      const input = new SetMainAreaInput();
      (input as any).code = '11';
      const errors = validateSync(input);
      expect(errors).toHaveLength(0);
    });

    it('code가 5자리면 통과한다', () => {
      const input = new SetMainAreaInput();
      (input as any).code = '11110';
      const errors = validateSync(input);
      expect(errors).toHaveLength(0);
    });

    it('code가 숫자 2/5자리가 아니면 실패한다', () => {
      const input = new SetMainAreaInput();
      (input as any).code = 'SEOUL';
      const errors = validateSync(input);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SetLocationInput', () => {
    it('유효한 위/경도는 통과한다', () => {
      const input = new SetLocationInput();
      input.latitude = 37.5026929;
      input.longitude = 127.0194146;

      const errors = validateSync(input);
      expect(errors).toHaveLength(0);
    });

    it('범위를 벗어난 latitude는 실패한다', () => {
      const input = new SetLocationInput();
      input.latitude = 90.000001 as any;
      input.longitude = 127.0194146;

      const errors = validateSync(input);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('latitude');
    });

    it('범위를 벗어난 longitude는 실패한다', () => {
      const input = new SetLocationInput();
      input.latitude = 37.5026929;
      input.longitude = 180.000001 as any;

      const errors = validateSync(input);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('longitude');
    });
  });
});


