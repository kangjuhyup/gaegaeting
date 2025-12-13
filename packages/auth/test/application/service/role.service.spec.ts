import { NotFoundException } from '@nestjs/common';
import { RoleService } from '../../../src/application/service/role.service';
import { RoleRepositoryPort } from '../../../src/application/port/repository/role-repository.port';
import { TenantRepositoryPort } from '../../../src/application/port/repository/tenant-repository.port';
import { Role } from '../../../src/domain/model/role';
import { Tenant } from '../../../src/domain/model/tenant';

describe('RoleService (UNIT)', () => {
  let service: RoleService;
  let roleRepo: jest.Mocked<RoleRepositoryPort>;
  let tenantRepo: jest.Mocked<TenantRepositoryPort>;

  const tenantId = 'test-tenant';
  const roleId = 'test-role';

  beforeEach(() => {
    roleRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assignRoleToUser: jest.fn(),
      removeRoleFromUser: jest.fn(),
      getUserRoles: jest.fn(),
    } as jest.Mocked<RoleRepositoryPort>;

    tenantRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByCode: jest.fn(),
    } as jest.Mocked<TenantRepositoryPort>;

    service = new RoleService(roleRepo, tenantRepo);
  });

  describe('createRole', () => {
    it('[createRole] - Tenant 조회 후 역할 생성 성공', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const role = Role.create({
        id: roleId,
        tenantId,
        code: 'admin',
        name: 'Admin',
        description: 'Administrator role',
      });

      tenantRepo.findById.mockResolvedValue(tenant);
      roleRepo.save.mockResolvedValue(role);

      // Act
      const result = await service.createRole({
        tenantId,
        code: 'admin',
        name: 'Admin',
        description: 'Administrator role',
      });

      // Assert
      expect(result).toEqual(role);
      expect(tenantRepo.findById).toHaveBeenCalledWith({ tenantId });
      expect(roleRepo.save).toHaveBeenCalledTimes(1);
      const savedRole = roleRepo.save.mock.calls[0][0];
      expect(savedRole.tenantId).toBe(tenantId);
      expect(savedRole.code).toBe('admin');
      expect(savedRole.name).toBe('Admin');
      expect(roleRepo.save.mock.calls[0][1]).toEqual(tenant);
    });

    it('[createRole] - Tenant가 없을 때 NotFoundException 발생', async () => {
      // Arrange
      tenantRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createRole({
          tenantId,
          code: 'admin',
          name: 'Admin',
        })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createRole({
          tenantId,
          code: 'admin',
          name: 'Admin',
        })
      ).rejects.toThrow(`Tenant with id '${tenantId}' not found`);
      expect(roleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('[findById] - 역할 조회 성공', async () => {
      // Arrange
      const role = Role.create({
        id: roleId,
        tenantId,
        code: 'admin',
        name: 'Admin',
      });

      roleRepo.findById.mockResolvedValue(role);

      // Act
      const result = await service.findById(roleId);

      // Assert
      expect(result).toEqual(role);
      expect(roleRepo.findById).toHaveBeenCalledWith(roleId);
    });

    it('[findById] - 역할이 없을 때 null 반환', async () => {
      // Arrange
      roleRepo.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById(roleId);

      // Assert
      expect(result).toBeNull();
    });
  });
});

