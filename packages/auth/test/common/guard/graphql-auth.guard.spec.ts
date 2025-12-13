import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GraphqlAuthGuard } from '@core/auth';
import { ENV_KEY } from '../../../src/common/config/env.config';
import { UserRepositoryPort } from '../../../src/application/port/repository/user-repository.port';
import { User } from '../../../src/domain/model/user';

// GqlExecutionContext 모킹
jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('GraphqlAuthGuard 단위테스트', () => {
  let guard: GraphqlAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let mockGqlContext: any;

  interface MockRequest {
    headers: {
      authorization?: string;
    };
    user?: any;
    _userDomainModel?: User;
  }

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    userRepository = {
      findById: jest.fn(),
    } as any;

    guard = new GraphqlAuthGuard(jwtService, configService, userRepository);

    // GqlExecutionContext.create 모킹
    mockGqlContext = {
      getContext: jest.fn(),
    };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockGqlContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('토큰이 없을 때 401 Unauthorized: 인증 토큰이 없습니다.', async () => {
    const mockRequest: MockRequest = {
      headers: {},
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('인증 토큰이 없습니다.'),
    );
  });

  it('Authorization 헤더 형식이 잘못되었을 때 401 Unauthorized: 인증 토큰 형식이 올바르지 않습니다.', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'InvalidFormat token123',
      },
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('인증 토큰 형식이 올바르지 않습니다.'),
    );
  });

  it('Bearer가 아닌 형식일 때 401 Unauthorized: 인증 토큰 형식이 올바르지 않습니다.', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Basic token123',
      },
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('인증 토큰 형식이 올바르지 않습니다.'),
    );
  });

  it('유효하지 않은 토큰일 때 401 Unauthorized: 유효하지 않은 토큰입니다.', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('유효하지 않은 토큰입니다.'),
    );

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-token', {
      secret: 'test-secret',
    });
  });

  it('유효한 토큰일 때 true 반환 및 req.user 설정', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const mockPayload = {
      sub: 'user-123',
      tenantId: 'tenant-456',
      iat: Math.floor(Date.now() / 1000),
    };

    const mockUser = User.create({
      id: 'user-123',
      tenantId: 'tenant-456',
      username: 'test-user',
      email: 'test@example.com',
    });

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    userRepository.findById.mockResolvedValue(mockUser);

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
    expect(mockRequest._userDomainModel).toEqual(mockUser);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
    expect(configService.get).toHaveBeenCalledWith(ENV_KEY.JWT_SECRET);
    expect(userRepository.findById).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('Authorization 헤더에서 Bearer 토큰을 올바르게 추출', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer extracted-token-123',
      },
    };

    const mockPayload = {
      sub: 'user-123',
      tenantId: 'tenant-456',
    };

    const mockUser = User.create({
      id: 'user-123',
      tenantId: 'tenant-456',
      username: 'test-user',
    });

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    userRepository.findById.mockResolvedValue(mockUser);

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await guard.canActivate(context);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('extracted-token-123', {
      secret: 'test-secret',
    });
    expect(mockRequest.user).toEqual(mockPayload);
    expect(mockRequest._userDomainModel).toEqual(mockUser);
    expect(userRepository.findById).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('User 조회 실패 시에도 인증은 성공 (JWT는 유효하지만 DB에 사용자가 없을 수 있음)', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const mockPayload = {
      sub: 'user-123',
      tenantId: 'tenant-456',
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    userRepository.findById.mockResolvedValue(null); // 사용자를 찾을 수 없음

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
    expect(mockRequest._userDomainModel).toBeUndefined();
    expect(userRepository.findById).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('User 조회 중 에러 발생 시에도 인증은 성공 (JWT는 유효하지만 DB 조회 실패)', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    const mockPayload = {
      sub: 'user-123',
      tenantId: 'tenant-456',
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    userRepository.findById.mockRejectedValue(new Error('Database error')); // DB 조회 실패

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
    expect(mockRequest._userDomainModel).toBeUndefined();
    expect(userRepository.findById).toHaveBeenCalledWith({ userId: 'user-123' });
  });

  it('토큰 검증 실패 시 UnauthorizedException 발생', async () => {
    const mockRequest: MockRequest = {
      headers: {
        authorization: 'Bearer expired-token',
      },
    };

    mockGqlContext.getContext.mockReturnValue({ req: mockRequest });
    configService.get.mockReturnValue('test-secret');
    jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

    const context = {
      getType: () => 'graphql',
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('유효하지 않은 토큰입니다.'),
    );
  });
});

