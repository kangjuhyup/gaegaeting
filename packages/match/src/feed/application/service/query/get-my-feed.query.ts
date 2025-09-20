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
        const feedWithUserPetList = await Promise.all(feedList.map(async feed => {
            if (feed.items) {
                feed.items = await Promise.all(feed.items.map(async item => {
                    try {
                        const user = await this.userApiPort.getUser(item.targetUserId);
                        const pet = await this.petApiPort.getPetsFromUser(item.targetUserId);
                        if (user && pet) {
                            item.detail = new ItemDetail(user, pet);
                        }
                        return item;
                    } catch (error) {
                        console.error(`Error fetching user/pet data for ${item.targetUserId}:`, error);
                        return item;
                    }
                }));
            }
            return feed;
        }));
        
        return feedWithUserPetList;
    }
    
    
}