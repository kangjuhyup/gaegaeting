import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AdminTokenService, AdminJwtPayload } from "../service/admin-token.service";
import { AdminGuard } from "./admin.guard";

describe('AdminGuard 단위테스트', () => {

    let adminTokenService: AdminTokenService;
    let adminGuard: AdminGuard;

    beforeEach(() => {
        adminTokenService = {
            verify: jest.fn(),
        } as any;
        adminGuard = new AdminGuard(adminTokenService);
    });

    it('토큰이 없을 때 401 Unauthorized: 어드민 인증 토큰이 없습니다.', async () => {
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

        await expect(adminGuard.canActivate(context)).rejects.toThrow(
            new UnauthorizedException('어드민 인증 토큰이 없습니다.')
        );
    });

    it('유효하지 않은 토큰일 때 401 Unauthorized: 유효하지 않은 어드민 토큰입니다.', async () => {
        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => {
                        return {
                            headers: {
                                authorization: 'Bearer invalid-token'
                            },
                            cookies: {}
                        };
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        jest.spyOn(adminTokenService, 'verify').mockRejectedValue(
            new UnauthorizedException('유효하지 않은 어드민 토큰입니다.')
        );

        await expect(adminGuard.canActivate(context)).rejects.toThrow(
            new UnauthorizedException('유효하지 않은 어드민 토큰입니다.')
        );
    });

    it('role이 ADMIN이 아닐 때 401 Unauthorized: 어드민 권한이 필요합니다.', async () => {
        const context = {
            switchToHttp: () => {
                return {
                    getRequest: () => {
                        return {
                            headers: {
                                authorization: 'Bearer valid-user-token'
                            },
                            cookies: {}
                        };
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                };
            }
        } as ExecutionContext;

        jest.spyOn(adminTokenService, 'verify').mockRejectedValue(
            new UnauthorizedException('어드민 권한이 필요합니다.')
        );

        await expect(adminGuard.canActivate(context)).rejects.toThrow(
            new UnauthorizedException('어드민 권한이 필요합니다.')
        );
    });

    it('Authorization 헤더에서 유효한 어드민 토큰을 추출하고 검증 성공', async () => {
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

        const result = await adminGuard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest['admin']).toEqual({
            adminId: 'admin-123',
            role: 'ADMIN'
        });
    });

    it('쿠키에서 유효한 어드민 토큰을 추출하고 검증 성공', async () => {
        const mockRequest = {
            headers: {},
            cookies: {
                adminAccessToken: 'valid-admin-token'
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

        const result = await adminGuard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest['admin']).toEqual({
            adminId: 'admin-456',
            role: 'ADMIN'
        });
    });

    it('Authorization 헤더가 쿠키보다 우선순위가 높음', async () => {
        const mockRequest = {
            headers: {
                authorization: 'Bearer header-token'
            },
            cookies: {
                adminAccessToken: 'cookie-token'
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

        await adminGuard.canActivate(context);

        // verify가 header-token으로 호출되었는지 확인
        expect(adminTokenService.verify).toHaveBeenCalledWith('header-token');
    });
});
