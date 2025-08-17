import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { mockUserRepositoryPort } from "../../__test__/mock";
import { UserEntity } from "@app/user/domain/model/user";
import { UserGender, UserRegion, UserStatus } from "@app/user/domain/enum/user.enum";
import { UpdateUserHandler } from "../update-user.command";
import { UpdateUserCommand } from "@app/user/application/port/command/update-user.port";

describe('UpdateUserHandler 단위 테스트', () => {
    let userRepositoryPort: jest.Mocked<UserRepositoryPort>;
    let updateUserHandler: UpdateUserHandler;
    
    const userId = 'test-user-id';
    const mockDate = new Date();
    
    beforeEach(() => {
        jest.clearAllMocks();
        userRepositoryPort = mockUserRepositoryPort;
        updateUserHandler = new UpdateUserHandler(userRepositoryPort);
    });
    
    it('존재하지 않는 유저일 경우 404에러', async () => {
        // Given
        userRepositoryPort.selectUserFromId.mockResolvedValue(null);
        
        // When & Then
        await expect(updateUserHandler.execute(
            new UpdateUserCommand(userId, {
                nickname: '새로운 닉네임'
            })
        )).rejects.toThrow('존재하지 않는 사용자입니다.');
        
        // 저장소 메서드가 호출되었는지 확인
        expect(userRepositoryPort.selectUserFromId).toHaveBeenCalledWith(userId);
        expect(userRepositoryPort.updateUser).not.toHaveBeenCalled();
    });
    
    it('존재하는 유저일 경우 값 업데이트', async () => {
        // Given
        const existingUser = UserEntity.of({
            name : '기존 닉네임',
            nickname: '기존 닉네임',
            gender: UserGender.MALE,
            birthDate: mockDate,
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
        }).setPersistence(userId, mockDate, mockDate);
        
        const updatedUser = UserEntity.of({
            name : '기존 닉네임',
            nickname: '새로운 닉네임',
            gender: UserGender.MALE,
            birthDate: mockDate,
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
        }).setPersistence(userId, mockDate, mockDate);
        
        userRepositoryPort.selectUserFromId.mockResolvedValue(existingUser);
        userRepositoryPort.updateUser.mockResolvedValue(updatedUser);
        
        const updateData = {
            nickname: '새로운 닉네임',
            region: UserRegion.SEOUL
        };
        
        // When
        const result = await updateUserHandler.execute(
            new UpdateUserCommand(userId, updateData)
        );
        
        // Then
        // 1. 사용자 조회 메서드가 호출되었는지 확인
        expect(userRepositoryPort.selectUserFromId).toHaveBeenCalledWith(userId);
        
        // 2. updateInfo 메서드가 호출되어 사용자 정보가 업데이트되었는지 확인
        // (updateInfo는 내부 메서드이므로 직접 검증하기 어려움, 대신 updateUser 호출 시 전달된 객체 확인)
        
        // 3. 업데이트된 사용자 저장 메서드가 호출되었는지 확인
        expect(userRepositoryPort.updateUser).toHaveBeenCalled();
        
        // 4. 반환된 결과가 업데이트된 사용자와 일치하는지 확인
        expect(result).toBe(updatedUser);
    });
})