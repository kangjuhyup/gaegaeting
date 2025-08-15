import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserService } from "../service/user.service";
import { UserGuard } from "./user.guard";
import { UserPrincipal } from "@app/type";

describe('UserGuard 단위테스트', () => {

    let userService : UserService;
    let userGuard : UserGuard;
    beforeEach(() => {
        userService = new UserService('http://localhost:3000');
        userGuard = new UserGuard(userService);
    })      

    it('인증 프로바이더 정보가 없을 때 403 Forbidden : 인증 프로바이더 정보가 없습니다.', () => {
        const context = {
            switchToHttp : () => {
                return {
                    getRequest : () => {
                        return {
                            auth : {
                                providerId : '123',
                                provider : {
                                }
                            }
                        }
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                }
            }
        } as ExecutionContext
        userGuard.canActivate(context).catch((err) => {
            expect(err).toBeInstanceOf(ForbiddenException);
            expect(err.message).toBe('인증 프로바이더 정보가 없습니다.');
        })
    })

    it('유저 프로필이 없을 때 403 Forbidden : 유저 프로필을 등록해주세요.', () => {
        const context = {
            switchToHttp : () => {
                return {
                    getRequest : () => {
                        return {
                            auth : {
                                providerId : '123',
                                provider : {
                                    label : 'KAKAO',
                                    value : 0
                                }
                            }
                        }
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                }
            }
        } as ExecutionContext

        jest.spyOn(userService, 'getUserFromProvider').mockRejectedValue(new Error(`HTTP 에러`));

        userGuard.canActivate(context).catch((err) => {
            expect(err).toBeInstanceOf(ForbiddenException);
            expect(err.message).toBe('유저 프로필을 등록해주세요.');
        })
    })

    it('인증 프로바이더 & 유저 프로필이 모두 존재할 때 통과', () => {
        const context = {
            switchToHttp : () => {
                return {
                    getRequest : () => {
                        return {
                            auth : {
                                providerId : '123',
                                provider : {
                                    label : 'KAKAO',
                                    value : 0
                                }
                            }
                        }
                    },
                    getResponse: () => ({}),
                    getNext: () => ({})
                }
            }
        } as ExecutionContext

        const mockUserPrincipal : UserPrincipal = {
            userId : '123',
            nickname : 'test',
            birth : 'test',
            region : 'test',
        }
        jest.spyOn(userService, 'getUserFromProvider').mockResolvedValue(mockUserPrincipal);

        userGuard.canActivate(context).then((result) => {
            expect(result).toBe(true);
        })
    })
})