import { JwtPort } from "@app/auth/domain/port/jwt.port";
import { AuthTokenService } from "../../auth-token.service";
import { AdminLoginCommandHandler } from '../admin-login.command';
import { AdminLoginCommand } from "@app/auth/application/port/command/admin-login.port";
import { AuthRepositoryPort } from "@app/auth/domain/port/auth-repository.port";

describe('AdminLoginHandler 단위 테스트', () => {
    let handler : AdminLoginCommandHandler
    let authTokenService: AuthTokenService;
    let jwtPort: jest.Mocked<JwtPort>;
    let authRepository: jest.Mocked<AuthRepositoryPort>;

    const mockAccessToken = 'test_access_token';
    const mockRefreshToken = 'test_refresh_token';

    beforeAll(() => {
        jest.clearAllMocks();
        
        jwtPort = {
            createAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
            createRefreshToken: jest.fn().mockResolvedValue(mockRefreshToken),
            getExpriesIn: jest.fn().mockReturnValue({
                accessToken: 3600,
                refreshToken: 604800
            }),
        } as any;

        authRepository = {
            saveAuth: jest.fn().mockResolvedValue(undefined),
        } as any;

        authTokenService = new AuthTokenService(
            authRepository,
            jwtPort
        );

        const configService = {
        get: jest.fn((key: string) => {
            if (key === 'ADMIN_PASSWORD') return 'abc';
            return undefined;
        }),
        } as any;
        handler = new AdminLoginCommandHandler(
            configService,
            authTokenService,
        )
    })

    it('id 가 일치하지 않을 경우 BadRequest 에러', async() => {
        const command = new AdminLoginCommand(
            'fail',
            'abc'
        )
        await expect(handler.execute(command)).rejects.toThrow('ID 또는 패스워드가 잘못되었습니다.')
    })

    it('패스워드 가 일치하지 않을 경우 BadRequest 에러', async() => {
        const command = new AdminLoginCommand(
            'admin',
            'fail'
        )
        await expect(handler.execute(command)).rejects.toThrow('ID 또는 패스워드가 잘못되었습니다.')
    })

    it('모두 일치할 경우 AuthToken 반환', async() => {
        const command = new AdminLoginCommand(
            'admin',
            'abc'
        )
        const result = await handler.execute(command)

        expect(result.getAccessToken()).toBe(mockAccessToken)
    })
})