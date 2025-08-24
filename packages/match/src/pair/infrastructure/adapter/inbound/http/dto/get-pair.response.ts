import { PairEntity } from "@app/pair/domain/model/pair";
import { ApiProperty } from "@nestjs/swagger";

class PetResponse {

    @ApiProperty({ description : '상대 유저의 반려동물ID'})
    private readonly petId : number;

    @ApiProperty({ description : '상대 유저의 반려동물 이름'})
    private readonly petName : string;

    @ApiProperty({ description : '상대 유저의 반려동물 이미지'})
    private readonly petImage : string;

    constructor(
        petId : number,
        petName : string,
        petImage : string
    ) {
        this.petId = petId;
        this.petName = petName;
        this.petImage = petImage;
    }

    static of(
        petId : number,
        petName : string,
        petImage : string
    ) : PetResponse {
        return new PetResponse(petId, petName, petImage)
    }
}

class PairResponse {
    @ApiProperty({ description : '페어 ID' })
    private readonly id : number

    @ApiProperty({ description : '상대 유저ID'})
    private readonly targetUserId: string;
    
    @ApiProperty({ description : '상대 유저닉네임'})
    private readonly targetUserNickname : string;

    @ApiProperty({ description : '상대 유저프로필 이미지'})
    private readonly targetUserImage : string;

    @ApiProperty({ description : '반려동물 목록', type : () => PetResponse, isArray : true})
    private readonly pets : PetResponse[]

    @ApiProperty({ description : '페어 생성 시간', type : Date })
    private readonly createdAt : Date

    constructor(
        id : number,
        targetUserId : string,
        targetUserNickname : string,
        targetUserImage : string,
        pets : PetResponse[],
        createdAt : Date
    ) {
        this.id = id;
        this.targetUserId = targetUserId;
        this.targetUserNickname = targetUserNickname;
        this.targetUserImage = targetUserImage;
        this.pets = pets;
        this.createdAt = createdAt;
    }

    static of(pair:PairEntity) : PairResponse {
        return new PairResponse(
            pair.id,
            pair.target.user.userId,
            pair.target.user.nickname,
            pair.target.user.profile,
            pair.target.pets.map(pet => PetResponse.of(pet.petId,pet.petName,pet.petProfile)),
            pair.createdAt
        )
    }
}

export class GetPairResponse {
    @ApiProperty({ description : '페어 목록', type : () => PairResponse , isArray : true})
    pairs : PairResponse[]

    constructor(
        pairs : PairResponse[]
    ) {
        this.pairs = pairs;
    }

    static of(pairs:PairEntity[]) : GetPairResponse {
        return new GetPairResponse(pairs.map(PairResponse.of))
    }
}