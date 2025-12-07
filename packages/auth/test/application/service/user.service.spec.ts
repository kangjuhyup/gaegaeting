import { UserService } from '../../../src/application/service/user.service';
import { UserRepositoryPort } from '../../../src/application/port/repository/user-repository.port';
import { UserIdentityRepositoryPort } from '../../../src/application/port/repository/user-identity-repository.port';
import { RoleRepositoryPort } from '../../../src/application/port/repository/role-repository.port';
import { PermissionRepositoryPort } from '../../../src/application/port/repository/permission-repository.port';
import { TenantRepositoryPort } from '../../../src/application/port/repository/tenant-repository.port';
import { User } from '../../../src/domain/model/user';
import { Tenant } from '../../../src/domain/model/tenant';
import { Role } from '../../../src/domain/model/role';
import { Permission } from '../../../src/domain/model/permission';

describe('UserService (UNIT)', () => {
  let service: UserService;
  let userRepo: jest.Mocked<UserRepositoryPort>;
  let userIdentityRepo: jest.Mocked<UserIdentityRepositoryPort>;
  let roleRepo: jest.Mocked<RoleRepositoryPort>;
  let permissionRepo: jest.Mocked<PermissionRepositoryPort>;
  let tenantRepo: jest.Mocked<TenantRepositoryPort>;

  const tenantId = 'test-tenant';
  const userId = 'test-user';

  beforeEach(() => {
    userRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTenant: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findByIdentity: jest.fn(),
      findByPhone: jest.fn(),
    } as jest.Mocked<UserRepositoryPort>;

    userIdentityRepo = {
      create: jest.fn(),
    } as jest.Mocked<UserIdentityRepositoryPort>;

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

    service = new UserService(
      userRepo,
      userIdentityRepo,
      roleRepo,
      permissionRepo,
      tenantRepo,
    );
  });

  describe('create', () => {
    it('[create] - Tenant 조회 후 사용자 생성 성공', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const user = User.create({
        id: userId,
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      const savedUser = User.create({
        id: userId,
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      tenantRepo.findById.mockResolvedValue(tenant);
      userRepo.save.mockResolvedValue(savedUser);

      // Act
      const result = await service.create(user);

      // Assert
      expect(result).toEqual(savedUser);
      expect(tenantRepo.findById).toHaveBeenCalledWith({ tenantId });
      expect(userRepo.save).toHaveBeenCalledWith(user, tenant);
    });

    it('[create] - Tenant가 없을 때 에러 발생', async () => {
      // Arrange
      const user = User.create({
        id: userId,
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      tenantRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(user)).rejects.toThrow(`Tenant not found: ${tenantId}`);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('[update] - Tenant 조회 후 사용자 업데이트 성공', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const user = User.create({
        id: userId,
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });
      const updatedUser = User.create({
        id: userId,
        tenantId,
        username: 'updated-user',
        email: 'updated@example.com',
      });

      tenantRepo.findById.mockResolvedValue(tenant);
      userRepo.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(user);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(tenantRepo.findById).toHaveBeenCalledWith({ tenantId });
      expect(userRepo.update).toHaveBeenCalledWith(user, tenant);
    });

    it('[update] - Tenant가 없을 때 에러 발생', async () => {
      // Arrange
      const user = User.create({
        id: userId,
        tenantId,
        username: 'test-user',
        email: 'test@example.com',
      });

      tenantRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(user)).rejects.toThrow(`Tenant not found: ${tenantId}`);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserRolesAndPermissions', () => {
    it('[getUserRolesAndPermissions] - 사용자의 역할과 권한 조회 성공', async () => {
      // Arrange
      const role1 = Role.create({
        id: 'role-1',
        tenantId,
        code: 'admin',
        name: 'Admin',
      });
      const role2 = Role.create({
        id: 'role-2',
        tenantId,
        code: 'user',
        name: 'User',
      });
      const permission1 = Permission.create({
        id: 'perm-1',
        tenantId,
        code: 'read',
        resource: 'user',
        action: 'read',
      });
      const permission2 = Permission.create({
        id: 'perm-2',
        tenantId,
        code: 'write',
        resource: 'user',
        action: 'write',
      });

      roleRepo.getUserRoles.mockResolvedValue([role1, role2]);
      permissionRepo.getRolePermissions
        .mockResolvedValueOnce([permission1, permission2]) // role1의 권한
        .mockResolvedValueOnce([permission1]); // role2의 권한

      // Act
      const result = await service.getUserRolesAndPermissions(userId);

      // Assert
      expect(result).toEqual({
        roles: ['admin', 'user'],
        permissions: ['read', 'write'], // 중복 제거됨
      });
      expect(roleRepo.getUserRoles).toHaveBeenCalledWith(userId, undefined);
      expect(permissionRepo.getRolePermissions).toHaveBeenCalledTimes(2);
    });

    it('[getUserRolesAndPermissions] - clientId가 있을 때 clientId 전달', async () => {
      // Arrange
      const clientId = 'client-1';
      roleRepo.getUserRoles.mockResolvedValue([]);

      // Act
      await service.getUserRolesAndPermissions(userId, clientId);

      // Assert
      expect(roleRepo.getUserRoles).toHaveBeenCalledWith(userId, clientId);
    });
  });

  describe('createUserFromSocialProfile', () => {
    it('[createUserFromSocialProfile] - 기존 사용자가 있을 때 기존 사용자 반환', async () => {
      // Arrange
      const existingUser = User.create({
        id: userId,
        tenantId,
        username: 'existing-user',
        email: 'existing@example.com',
      });

      userRepo.findByIdentity.mockResolvedValue(existingUser);

      // Act
      const result = await service.createUserFromSocialProfile({
        tenantId,
        provider: 'kakao',
        providerSub: 'kakao-id',
        username: 'new-username',
        email: 'new@example.com',
      });

      // Assert
      expect(result).toEqual(existingUser);
      expect(userRepo.findByIdentity).toHaveBeenCalledWith(tenantId, 'kakao', 'kakao-id');
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(userIdentityRepo.create).not.toHaveBeenCalled();
    });

    it('[createUserFromSocialProfile] - 새 사용자 생성 및 Identity 생성', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const newUser = User.create({
        id: userId,
        tenantId,
        username: 'kakao_kakao-id',
        email: 'new@example.com',
      });

      userRepo.findByIdentity.mockResolvedValue(null);
      tenantRepo.findById.mockResolvedValue(tenant);
      userRepo.save.mockResolvedValue(newUser);
      userIdentityRepo.create.mockResolvedValue(undefined as any);

      // Act
      const result = await service.createUserFromSocialProfile({
        tenantId,
        provider: 'kakao',
        providerSub: 'kakao-id',
        email: 'new@example.com',
      });

      // Assert
      expect(result).toEqual(newUser);
      expect(tenantRepo.findById).toHaveBeenCalledWith({ tenantId });
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(userIdentityRepo.create).toHaveBeenCalledWith({
        tenantId,
        userId: newUser.id,
        provider: 'kakao',
        providerSub: 'kakao-id',
        email: 'new@example.com',
        profileJson: undefined,
      });
    });

    it('[createUserFromSocialProfile] - username이 제공되면 해당 username 사용', async () => {
      // Arrange
      const tenant = Tenant.create({
        id: tenantId,
        code: 'test',
        name: 'Test Tenant',
      });
      const newUser = User.create({
        id: userId,
        tenantId,
        username: 'custom-username',
        email: 'new@example.com',
      });

      userRepo.findByIdentity.mockResolvedValue(null);
      tenantRepo.findById.mockResolvedValue(tenant);
      userRepo.save.mockResolvedValue(newUser);
      userIdentityRepo.create.mockResolvedValue(undefined as any);

      // Act
      await service.createUserFromSocialProfile({
        tenantId,
        provider: 'kakao',
        providerSub: 'kakao-id',
        username: 'custom-username',
        email: 'new@example.com',
      });

      // Assert
      const saveCall = userRepo.save.mock.calls[0][0];
      expect(saveCall.username).toBe('custom-username');
    });

    it('[createUserFromSocialProfile] - Tenant가 없을 때 에러 발생', async () => {
      // Arrange
      userRepo.findByIdentity.mockResolvedValue(null);
      tenantRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createUserFromSocialProfile({
          tenantId,
          provider: 'kakao',
          providerSub: 'kakao-id',
          email: 'new@example.com',
        })
      ).rejects.toThrow(`Tenant not found: ${tenantId}`);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });
});

