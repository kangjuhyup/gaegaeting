import { TenantService } from '../../../src/application/service/tenant.service';
import { TenantRepositoryPort } from '../../../src/application/port/repository/tenant-repository.port';
import { Tenant } from '../../../src/domain/model/tenant';
import { Repository } from 'typeorm';
import { TenantConfigOrmEntity } from '@core/database';

describe('TenantService (UNIT)', () => {
  let service: TenantService;
  let tenantRepo: jest.Mocked<TenantRepositoryPort>;
  let configRepo: jest.Mocked<Repository<TenantConfigOrmEntity>>;

  const tenantId = 'test-tenant';

  beforeEach(() => {
    tenantRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByCode: jest.fn(),
    } as jest.Mocked<TenantRepositoryPort>;

    configRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new TenantService(tenantRepo, configRepo);
  });

  describe('createTenant', () => {
    it('[createTenant] - 테넌트 생성 성공', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });

      tenantRepo.save.mockResolvedValue(tenant);

      // Act
      const result = await service.createTenant({
        code: 'test',
        name: 'Test Tenant',
      });

      // Assert
      expect(result).toEqual(tenant);
      expect(tenantRepo.save).toHaveBeenCalledTimes(1);
      const savedTenant = tenantRepo.save.mock.calls[0][0];
      expect(savedTenant.code).toBe('test');
      expect(savedTenant.name).toBe('Test Tenant');
    });
  });

  describe('getTenantConfig', () => {
    it('[getTenantConfig] - 테넌트 설정 조회 성공', async () => {
      // Arrange
      const config = {
        tenantId,
        signupPolicy: 'open' as const,
        requirePhoneVerify: false,
        brandName: 'Test Brand',
        extra: { key: 'value' },
      };

      configRepo.findOne.mockResolvedValue(config as any);

      // Act
      const result = await service.getTenantConfig(tenantId);

      // Assert
      expect(result).toEqual({
        tenantId,
        signupPolicy: 'open',
        requirePhoneVerify: false,
        brandName: 'Test Brand',
        extra: { key: 'value' },
      });
      expect(configRepo.findOne).toHaveBeenCalledWith({ where: { tenantId } });
    });

    it('[getTenantConfig] - 설정이 없을 때 null 반환', async () => {
      // Arrange
      configRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getTenantConfig(tenantId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateTenantConfig', () => {
    it('[updateTenantConfig] - 기존 설정 업데이트 성공', async () => {
      // Arrange
      const existingConfig = {
        tenantId,
        signupPolicy: 'open' as const,
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      };
      const updatedConfig = {
        ...existingConfig,
        signupPolicy: 'invite' as const,
        requirePhoneVerify: true,
      };

      configRepo.findOne.mockResolvedValue(existingConfig as any);
      configRepo.save.mockResolvedValue(updatedConfig as any);

      // Act
      const result = await service.updateTenantConfig(tenantId, {
        signupPolicy: 'invite',
        requirePhoneVerify: true,
      });

      // Assert
      expect(result).toEqual({
        tenantId,
        signupPolicy: 'invite',
        requirePhoneVerify: true,
        brandName: null,
        extra: null,
      });
      expect(configRepo.findOne).toHaveBeenCalledWith({ where: { tenantId } });
      expect(configRepo.save).toHaveBeenCalled();
    });

    it('[updateTenantConfig] - 설정이 없을 때 새로 생성', async () => {
      // Arrange
      const newConfig = {
        tenantId,
        signupPolicy: 'open' as const,
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      };

      configRepo.findOne.mockResolvedValue(null);
      configRepo.create.mockReturnValue(newConfig as any);
      configRepo.save.mockResolvedValue(newConfig as any);

      // Act
      const result = await service.updateTenantConfig(tenantId, {
        signupPolicy: 'open',
      });

      // Assert
      expect(result).toEqual({
        tenantId,
        signupPolicy: 'open',
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      });
      expect(configRepo.create).toHaveBeenCalledWith({
        tenantId,
        signupPolicy: 'open',
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      });
    });
  });
});

