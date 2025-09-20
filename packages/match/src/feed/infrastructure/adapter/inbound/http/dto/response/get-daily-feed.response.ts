import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { YYYYMMDD } from "@core/util";
import { ApiProperty } from "@nestjs/swagger";

class FeedItemResponse {
    @ApiProperty({description : '피드 아이템 ID'})
    private readonly id : number;
    @ApiProperty({description : '상대방 ID'})
    private readonly userId : string;
    @ApiProperty({description : '상대방 닉네임'})
    private readonly nickname : string;
    @ApiProperty({description : '상대방 프로필 이미지'})
    private readonly profile : string;
    
    @ApiProperty({description : '상대방 반려동물 ID', required : false})
    private readonly petId? : number;
    @ApiProperty({description : '상대방 반려동물 이미지', required : false})
    private readonly petProfile? : string;

    constructor(
        id : number,
        userId : string,
        nickname : string,
        profile : string,
        petId? : number,
        petProfile? : string
    ) {
        this.id = id;   
        this.userId = userId;
        this.nickname = nickname;
        this.profile = profile;
        this.petId = petId;
        this.petProfile = petProfile;
    }

    static from(
        item : FeedItemEntity
    ) : FeedItemResponse {
        return new FeedItemResponse(
            item.id,
            item.detail.user.id,
            item.detail.user.nickname,
            item.detail.user.profile,
            item.detail.pets && item.detail.pets.length > 0 ? item.detail.pets[0].id : undefined,
            item.detail.pets && item.detail.pets.length > 0 && item.detail.pets[0].profileImages && item.detail.pets[0].profileImages.length > 0 ? item.detail.pets[0].profileImages[0] : undefined
        )
    }
}

class GetFeedResponse {
    @ApiProperty({description : '피드ID' })
    private readonly id : number;
    @ApiProperty({description : '날짜', type : () => YYYYMMDD})
    private readonly date : YYYYMMDD;
    @ApiProperty({description : '시간'})
    private readonly slot : number;
    @ApiProperty({description : '피드 아이템 목록', type : () => FeedItemResponse, isArray : true})
    private readonly items : FeedItemResponse[]

    constructor(
        id : number,
        date : YYYYMMDD,
        slot : number,
        items : FeedItemResponse[]
    ) {
        this.id = id;
        this.date = date;
        this.slot = slot;
        this.items = items;
    }

    static from(
        feed : FeedEntity
    ) : GetFeedResponse {
        return new GetFeedResponse(
            feed.id,
            feed.date,
            feed.slot,
            feed.items?.map(item => FeedItemResponse.from(item))
        )
    }
}

export class GetDailyFeedResponse {
    @ApiProperty({description : '피드 목록', type : () => GetFeedResponse, isArray : true})
    private readonly feeds : GetFeedResponse[]

    constructor(
        feeds : GetFeedResponse[]
    ) {
        this.feeds = feeds;
    }

    static from(
        feeds : FeedEntity[]
    ) : GetDailyFeedResponse {
        return new GetDailyFeedResponse(
            feeds.map(feed => GetFeedResponse.from(feed))
        )
    }
}
