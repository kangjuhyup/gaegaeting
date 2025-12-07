import { NotFoundException } from '@nestjs/common';
import { PermissionService } from '../../../src/application/service/permission.service';
import { PermissionRepositoryPort } from '../../../src/application/port/repository/permission-repository.port';
import { TenantRepositoryPort } from '../../../src/application/port/repository/tenant-repository.port';
import { Permission } from '../../../src/domain/model/permission';
import { Tenant } from '../../../src/domain/model/tenant';

describe('PermissionService (UNIT)', () => {
  let service: PermissionService;
  let permissionRepo: jest.Mocked<PermissionRepositoryPort>;
  let tenantRepo: jest.Mocked<TenantRepositoryPort>;

  const tenantId = 'test-tenant';
  const permissionId = 'test-permission';

  beforeEach(() => {
    permissionRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assignPermissionToRole: jest.fn(),
      removePermissionFromRole: jest.fn(),
      getRolePermissions: jest.fn(),
    } as jest.Mocked<PermissionRepositoryPort>;

    tenantRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByCode: jest.fn(),
    } as jest.Mocked<TenantRepositoryPort>;

    service = new PermissionService(permissionRepo, tenantRepo);
  });

  describe('createPermission', () => {
    it('[createPermission] - Tenant 조회 후 권한 생성 성공', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const permission = Permission.create({
        id: permissionId,
        tenantId,
        code: 'read',
        resource: 'user',
        action: 'read',
        description: 'Read permission',
      });

      tenantRepo.findById.mockResolvedValue(tenant);
      permissionRepo.save.mockResolvedValue(permission);

      // Act
      const result = await service.createPermission({
        tenantId,
        code: 'read',
        resource: 'user',
        action: 'read',
        description: 'Read permission',
      });

      // Assert
      expect(result).toEqual(permission);
      expect(tenantRepo.findById).toHaveBeenCalledWith({ tenantId });
      expect(permissionRepo.save).toHaveBeenCalledTimes(1);
      const savedPermission = permissionRepo.save.mock.calls[0][0];
      expect(savedPermission.tenantId).toBe(tenantId);
      expect(savedPermission.code).toBe('read');
      expect(permissionRepo.save.mock.calls[0][1]).toEqual(tenant);
    });

    it('[createPermission] - Tenant가 없을 때 NotFoundException 발생', async () => {
      // Arrange
      tenantRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createPermission({
          tenantId,
          code: 'read',
        })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createPermission({
          tenantId,
          code: 'read',
        })
      ).rejects.toThrow(`Tenant with id '${tenantId}' not found`);
      expect(permissionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('[findById] - 권한 조회 성공', async () => {
      // Arrange
      const permission = Permission.create({
        id: permissionId,
        tenantId,
        code: 'read',
      });

      permissionRepo.findById.mockResolvedValue(permission);

      // Act
      const result = await service.findById(permissionId);

      // Assert
      expect(result).toEqual(permission);
      expect(permissionRepo.findById).toHaveBeenCalledWith(permissionId);
    });

    it('[findById] - 권한이 없을 때 null 반환', async () => {
      // Arrange
      permissionRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById(permissionId);

      // Assert
      expect(result).toBeNull();
    });
  });
});

