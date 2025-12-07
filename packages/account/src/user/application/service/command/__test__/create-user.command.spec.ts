import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { mockUserRepositoryPort } from "../../__test__/mock"
import { UserGender, UserRegion, UserStatus } from "@app/user/domain/enum/user.enum";
import { UserEntity } from "@app/user/domain/model/user";
import { CreateUserHandler } from "../create-user.command";
import { CreateUserCommand } from "@app/user/application/port/command/create-user.port";

// Mock DataSource for @Transactional decorator
const mockDataSource = {
    transaction: jest.fn((callback) => {
        return callback({} as any);
    })
};

describe('CreateUserHanlder 단위 테스트', () => {

    let userRepositoryPort : jest.Mocked<UserRepositoryPort>;

    let createUserHandler : CreateUserHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        userRepositoryPort = mockUserRepositoryPort

        createUserHandler = new CreateUserHandler(userRepositoryPort);
        (createUserHandler as any).dataSource = mockDataSource;
    })
    
    it('이미 존재하는 사용자라면 에러를 던진다.', async () => {
        // Given
        const existsUser = UserEntity.of({
            name : 'test-nickname',
            nickname: 'test-nickname',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            phoneNumber: '01012345678',
            status: UserStatus.ACTIVE,
        }).setPersistence('test-user-id', new Date(), new Date());
        userRepositoryPort.selectUserFromAuthProvider.mockResolvedValue(existsUser);

        // When & Then
        await expect(createUserHandler.execute(
            new CreateUserCommand(
                0,
                'test-provider-id',
                UserEntity.of({
                    name : 'test-nickname',
                    nickname: 'test-nickname',
                    gender: UserGender.MALE,
                    birthDate: new Date(),
                    region: UserRegion.SEOUL,
                    phoneNumber: '01012345678',
                    status: UserStatus.ACTIVE,
                })
            )
        )).rejects.toThrow('이미 존재하는 사용자입니다.');
    })

    it('존재하지 않는 사용자라면 UserEntity를 저장한다.', async () => {
        // Given
        const newUser = UserEntity.of({
            name : 'new-user',
            nickname: 'new-user',
            gender: UserGender.FEMALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            phoneNumber: '01098765432',
            status: UserStatus.ACTIVE,
        });
        
        const savedUser = UserEntity.of({
            name : 'new-user',
            nickname: 'new-user',
            gender: UserGender.FEMALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            phoneNumber: '01098765432',
            status: UserStatus.ACTIVE,
        }).setPersistence('new-user-id', new Date(), new Date());
        
        
        // 사용자가 존재하지 않음을 모의
        userRepositoryPort.selectUserFromAuthProvider.mockResolvedValue(null);
        // 사용자 저장 후 반환값 모의
        userRepositoryPort.insertUser.mockResolvedValue(savedUser);
        
        // When
        const result = await createUserHandler.execute(
            new CreateUserCommand(0,'kakao-provider-id', newUser)
        );
        
        // Then
        // 1. 사용자 저장 메서드가 호출되었는지 확인
        expect(userRepositoryPort.insertUser).toHaveBeenCalledWith(newUser);
        // 2. 반환된 사용자가 저장된 사용자와 일치하는지 확인
        expect(result).toBe(savedUser);
    })
})