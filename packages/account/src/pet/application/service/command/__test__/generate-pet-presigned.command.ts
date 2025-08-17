import { PetRepositoryPort } from "@app/pet/domain/port/pet-repository.port"
import { PetStoragePort } from "@app/pet/domain/port/pet-storage.port"
import { GeneratePetPresignedUrlHandler } from '../generate-pet-presigned.command';
import { mockPetRepositoryPort, mockPetStoragePort } from "../../__test__/mock";
import { GeneratePetPresignedCommand } from "@app/pet/application/port/command/generate-pet-presigned.port";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";

describe('GeneratePetPresignedUrlHandler 단위 테스트', () => {
    
    let petStoragePort : jest.Mocked<PetStoragePort>
    let petRepositoryPort : jest.Mocked<PetRepositoryPort>
    
    let generatePetPresignedUrlHandler : GeneratePetPresignedUrlHandler

    beforeEach(() => {
        petRepositoryPort = mockPetRepositoryPort,
        petStoragePort = mockPetStoragePort

        generatePetPresignedUrlHandler = new GeneratePetPresignedUrlHandler(petStoragePort,petRepositoryPort)
    })

    it('PresignedUrl 을 생성 후 PetProfileEntity 를 비활성화 상태로 저장한다.', async () => {
        // Given
        const petId = 1;
        const no = 1;
        const command = new GeneratePetPresignedCommand(petId, no);
        
        const mockPresignedUrl = {
            presignedUrl: 'https://example.com/presigned-url',
            path: 'pet/1/1.jpg'
        };
        const mockExpiresIn = 3600;
        const expectedPresignedUrl = PresignedUrl.from(mockPresignedUrl, mockExpiresIn);
        
        // Mock 설정
        petStoragePort.getPresignedUrl.mockResolvedValue(expectedPresignedUrl);
        petRepositoryPort.insertPetAttachment.mockResolvedValue(undefined);
        
        // When
        const result = await generatePetPresignedUrlHandler.execute(command);
        
        // Then
        expect(petStoragePort.getPresignedUrl).toHaveBeenCalledWith(petId, no);
        expect(petRepositoryPort.insertPetAttachment).toHaveBeenCalled();
        
        const petProfileArg = petRepositoryPort.insertPetAttachment.mock.calls[0][0];
        expect(petProfileArg).toBeInstanceOf(PetProfileEntity);
        expect(petProfileArg.path).toBe(mockPresignedUrl.path);
        expect(petProfileArg.isActive).toBe(false);
        
        // 반환된 결과가 예상한 PresignedUrl과 일치하는지 검증
        expect(result).toBe(expectedPresignedUrl);
    })
})