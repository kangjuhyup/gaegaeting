import { FeedEntity } from "@app/feed/domain/model/feed";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetMyFeedQuery } from '../../port/query/get-my-feed.port';
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { YYYYMMDD } from "@core/util";
import { PetApiPort } from "@app/feed/domain/port/pet-api.port";
import { UserApiPort } from "@app/feed/domain/port/user-api.port";
import { ItemDetail } from "@app/feed/domain/model/vo/item-detail";

@QueryHandler(GetMyFeedQuery)
export class GetMyFeedHandler implements IQueryHandler<GetMyFeedQuery,FeedEntity[]> {
    
    constructor(
        private readonly feedRepository : FeedRepositoryPort,
        private readonly userApiPort : UserApiPort,
        private readonly petApiPort : PetApiPort
    ) {}
    
    async execute(query: GetMyFeedQuery): Promise<FeedEntity[]> {
        const date = YYYYMMDD.today()
        const feedList = await this.feedRepository.getMyFeedWithItems(query.user.userId,date)    
        await Promise.all(feedList.map(async feed => {
            feed.items?.forEach(async item => {
                const user = await this.userApiPort.getUser(item.targetUserId);
                const pet = await this.petApiPort.getPetsFromUser(item.targetUserId)
                item.detail = new ItemDetail(user,pet)
            })
        }))
        return feedList
    }
    
    
}