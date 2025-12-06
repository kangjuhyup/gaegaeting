import { ExecutionContext } from "@nestjs/common";
import { AdminTokenService, AdminJwtPayload } from "../service/admin-token.service";
import { JwtTokenService } from "../service/jwt-token.service";
import { FlexibleAuthGuard } from "./flexible-auth.guard";

describe('FlexibleAuthGuard 단위테스트', () => {

    let adminTokenService: AdminTokenService;
    let jwtTokenService: JwtTokenService;
    let flexibleAuthGuard: FlexibleAuthGuard;

    beforeEach(() => {
        adminTokenService = {
            verify: jest.fn(),
        } as any;
        jwtTokenService = {
            verify: jest.fn(),
        } as any;
        flexibleAuthGuard = new FlexibleAuthGuard(adminTokenService, jwtTokenService);
    });

    it('토큰이 없을 때 false 반환', async () => {
        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => {
                        return {
                            headers: {},
                            cookies: {}
                        };
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const result = await flexibleAuthGuard.canActivate(context);

        expect(result).toBe(false);
    });

    it('유효한 Admin 토큰일 때 검증 성공 및 authType=admin 설정', async () => {
        const mockRequest = {
            headers: {
                authorization: 'Bearer valid-admin-token'
            },
            cookies: {}
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const mockAdminPayload: AdminJwtPayload = {
            adminId: 'admin-123',
            role: 'ADMIN'
        };

        jest.spyOn(adminTokenService, 'verify').mockResolvedValue(mockAdminPayload);

        const result = await flexibleAuthGuard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest['authType']).toBe('admin');
        expect(mockRequest['admin']).toEqual({
            adminId: 'admin-123',
            role: 'ADMIN'
        });
    });

    it('Admin 토큰 검증 실패 시 User 토큰 검증 시도', async () => {
        const mockRequest = {
            headers: {
                authorization: 'Bearer valid-user-token'
            },
            cookies: {}
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const mockUserPayload = {
            userId: 'user-123',
            provider: 'KAKAO',
            providerId: 'kakao-123'
        };

        // Admin 검증 실패
        jest.spyOn(adminTokenService, 'verify').mockRejectedValue(new Error('Not admin token'));
        // User 검증 성공
        jest.spyOn(jwtTokenService, 'verify').mockResolvedValue(mockUserPayload);

        const result = await flexibleAuthGuard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest['authType']).toBe('user');
        expect(mockRequest['user']).toEqual(mockUserPayload);
    });

    it('Admin과 User 토큰 모두 검증 실패 시 false 반환', async () => {
        const mockRequest = {
            headers: {
                authorization: 'Bearer invalid-token'
            },
            cookies: {}
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        // Admin 검증 실패
        jest.spyOn(adminTokenService, 'verify').mockRejectedValue(new Error('Invalid admin token'));
        // User 검증 실패
        jest.spyOn(jwtTokenService, 'verify').mockRejectedValue(new Error('Invalid user token'));

        const result = await flexibleAuthGuard.canActivate(context);

        expect(result).toBe(false);
    });

    it('Authorization 헤더에서 토큰 추출', async () => {
        const mockRequest = {
            headers: {
                authorization: 'Bearer header-token'
            },
            cookies: {
                adminAccessToken: 'admin-cookie-token',
                accessToken: 'user-cookie-token'
            }
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const mockAdminPayload: AdminJwtPayload = {
            adminId: 'admin-456',
            role: 'ADMIN'
        };

        jest.spyOn(adminTokenService, 'verify').mockResolvedValue(mockAdminPayload);

        await flexibleAuthGuard.canActivate(context);

        // Authorization 헤더의 토큰이 사용되었는지 확인
        expect(adminTokenService.verify).toHaveBeenCalledWith('header-token');
    });

    it('쿠키에서 adminAccessToken 우선 추출', async () => {
        const mockRequest = {
            headers: {},
            cookies: {
                adminAccessToken: 'admin-cookie-token',
                accessToken: 'user-cookie-token'
            }
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const mockAdminPayload: AdminJwtPayload = {
            adminId: 'admin-789',
            role: 'ADMIN'
        };

        jest.spyOn(adminTokenService, 'verify').mockResolvedValue(mockAdminPayload);

        await flexibleAuthGuard.canActivate(context);

        // adminAccessToken이 사용되었는지 확인
        expect(adminTokenService.verify).toHaveBeenCalledWith('admin-cookie-token');
    });

    it('adminAccessToken이 없으면 accessToken 사용', async () => {
        const mockRequest = {
            headers: {},
            cookies: {
                accessToken: 'user-cookie-token'
            }
        };

        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => mockRequest,
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        const mockUserPayload = {
            userId: 'user-456',
            provider: 'NAVER',
            providerId: 'naver-456'
        };

        // Admin 검증 실패 (user 토큰이므로)
        jest.spyOn(adminTokenService, 'verify').mockRejectedValue(new Error('Not admin'));
        // User 검증 성공
        jest.spyOn(jwtTokenService, 'verify').mockResolvedValue(mockUserPayload);

        await flexibleAuthGuard.canActivate(context);

        // accessToken이 사용되었는지 확인
        expect(jwtTokenService.verify).toHaveBeenCalledWith('user-cookie-token');
    });
});
