import { InitService } from '../../../src/common/service/init.service';
import { TenantOrmEntity } from '@core/database';
import { ENV_KEY } from '../../../src/common/config/env.config';
import { Role } from '../../../src/domain/model/role';
import type { UserServicePort } from '../../../src/application/port/user-service.port';
import type { RoleServicePort } from '../../../src/application/port/role-service.port';

describe('InitService (UNIT)', () => {
  const rootUserId = '01KCBC1DKQTGNRKTG22DMSBTWR'; // ULID(26)
  const rootPassword = 'root-password';

  const makeTenantRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const makeDataSource = (tenantRepo: any) => ({
    getRepository: jest.fn((entity: any) => {
      if (entity === TenantOrmEntity) return tenantRepo;
      throw new Error(`Unexpected repository: ${entity?.name ?? String(entity)}`);
    }),
  });

  const makeConfig = () => ({
    get: jest.fn((key: string) => {
      if (key === ENV_KEY.AUTH_ROOT_ID) return rootUserId;
      if (key === ENV_KEY.AUTH_ROOT_PASSWORD) return rootPassword;
      return undefined;
    }),
  });

  const makeUserService = (): jest.Mocked<UserServicePort> =>
    ({
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findByIdentity: jest.fn(),
      findByTenant: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      getUserRolesAndPermissions: jest.fn(),
      createIdentity: jest.fn(),
      createUserFromSocialProfile: jest.fn(),
    }) as any;

  const makeRoleService = (): jest.Mocked<RoleServicePort> =>
    ({
      createRole: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assignRoleToUser: jest.fn(),
      removeRoleFromUser: jest.fn(),
      getUserRoles: jest.fn(),
    }) as any;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('initializeDefaultTenant: tenant가 없으면 생성한다', async () => {
    const tenantRepo = makeTenantRepo();
    tenantRepo.findOne.mockResolvedValue(null);
    tenantRepo.create.mockImplementation((x: any) => x);
    tenantRepo.save.mockResolvedValue({ id: 1, code: 'gaegaeting', name: '개개팅' });

    const service = new InitService(
      makeDataSource(tenantRepo) as any,
      makeUserService() as any,
      makeConfig() as any,
      makeRoleService() as any,
    );

    await (service as any).initializeDefaultTenant();

    expect(tenantRepo.create).toHaveBeenCalledWith({ code: 'gaegaeting', name: '개개팅' });
    expect(tenantRepo.save).toHaveBeenCalledTimes(1);
  });

  test('initializeAdminUser: tenant가 없으면 아무 것도 하지 않는다', async () => {
    const tenantRepo = makeTenantRepo();
    tenantRepo.findOne.mockResolvedValue(null);

    const userService = makeUserService();
    const roleService = makeRoleService();

    const service = new InitService(
      makeDataSource(tenantRepo) as any,
      userService as any,
      makeConfig() as any,
      roleService as any,
    );

    await (service as any).initializeAdminUser();

    expect(userService.existsByUsername).not.toHaveBeenCalled();
    expect(userService.create).not.toHaveBeenCalled();
    expect(roleService.assignRoleToUser).not.toHaveBeenCalled();
  });

  test('initializeAdminUser: admin이 없으면 root 유저 생성 + ADMIN role 생성/할당', async () => {
    const tenantRepo = makeTenantRepo();
    tenantRepo.findOne.mockResolvedValue({ id: 1, code: 'gaegaeting', name: '개개팅' });

    const userService = makeUserService();
    userService.existsByUsername.mockResolvedValue(false);
    userService.create.mockResolvedValue(undefined as any);

    const roleService = makeRoleService();
    roleService.findByCode.mockResolvedValue(null);
    roleService.createRole.mockResolvedValue(
      Role.of(
        { tenantId: '1', code: 'ADMIN', name: 'ADMIN', description: 'System administrator role' },
        '1',
      ),
    );
    roleService.assignRoleToUser.mockResolvedValue(undefined as any);

    const service = new InitService(
      makeDataSource(tenantRepo) as any,
      userService as any,
      makeConfig() as any,
      roleService as any,
    );

    await (service as any).initializeAdminUser();

    expect(userService.existsByUsername).toHaveBeenCalledWith('1', 'root');
    expect(userService.create).toHaveBeenCalledTimes(1);
    const createdUser = userService.create.mock.calls[0][0];
    expect(createdUser.id).toBe(rootUserId);
    expect(createdUser.username).toBe('root');
    expect(createdUser.tenantId).toBe('1');
    expect(roleService.assignRoleToUser).toHaveBeenCalledWith(rootUserId, '1');
  });

  test('initializeAdminUser: admin이 이미 있으면 ADMIN role은 항상 보장/할당', async () => {
    const tenantRepo = makeTenantRepo();
    tenantRepo.findOne.mockResolvedValue({ id: 1, code: 'gaegaeting', name: '개개팅' });

    const userService = makeUserService();
    userService.existsByUsername.mockResolvedValue(true);
    userService.findByTenant.mockResolvedValue({
      users: [
        // 도메인 User는 필요 없고, InitService가 id/username만 쓰므로 최소 형태로 충분
        { id: rootUserId, username: 'root' } as any,
      ],
      total: 1,
    });

    const roleService = makeRoleService();
    roleService.findByCode.mockResolvedValue(
      Role.of({ tenantId: '1', code: 'ADMIN', name: 'ADMIN', description: null }, '99'),
    );

    const service = new InitService(
      makeDataSource(tenantRepo) as any,
      userService as any,
      makeConfig() as any,
      roleService as any,
    );

    await (service as any).initializeAdminUser();

    expect(userService.findByTenant).toHaveBeenCalledWith({
      tenantId: '1',
      search: 'root',
      skip: 0,
      take: 10,
    });
    expect(roleService.assignRoleToUser).toHaveBeenCalledWith(rootUserId, '99');
  });
});


