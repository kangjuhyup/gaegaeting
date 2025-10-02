import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateFeedCommand } from "../../port/command/create-feed.port";
import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";
import { YYYYMMDD } from "@core/util";
import { Transactional } from "@core/database";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";

@CommandHandler(CreateFeedCommand)
export class CreateFeedCommandHandler implements ICommandHandler<CreateFeedCommand,FeedEntity> {
    
    constructor(
        private readonly feedRepository: FeedRepositoryPort,
        private readonly feedItemRepository: FeedItemRepositoryPort,
        private readonly locationRepository: LocationRepositoryPort
    ) {}
    
    @Transactional()
    async execute(command: CreateFeedCommand): Promise<FeedEntity> {
        const today = YYYYMMDD.today();
        const currentSlot = this.getCurrentSlot();
        const expiresAt = this.getSlotExpiresAt(currentSlot);
        
        // 1. Feed 생성
        const feed = FeedEntity.of({
            userId: command.user.userId,
            date: today,
            slot: currentSlot,
            expiresAt: expiresAt
        });
        
        const savedFeed = await this.feedRepository.saveFeed(feed);
        
        // 2. 사용자 위치 조회
        const userLocation = await this.locationRepository.selectLocationFromUserId(command.user.userId);
        if (!userLocation) {
            return savedFeed;
        }
        
        // 3. 주변 후보자 찾기
        const targets = await this.locationRepository.findNearbyTargets(command.user.userId, userLocation.latitude, userLocation.longitude, today);
        
        // 4. FeedItem 생성
        const feedItems = targets.map(targetUserId => 
            FeedItemEntity.of({
                feedId: savedFeed.id!,
                targetUserId,
                state: 1 // delivery state
            })
        );
        
        if (feedItems.length > 0) {
            savedFeed.items = await Promise.all(feedItems.map(item => this.feedItemRepository.saveFeedItem(item)));
        }
        
        return savedFeed;
    }
    
    private getCurrentSlot(): 1 | 2 | 3 {
        const hour = new Date().getHours();
        if (hour < 8) return 1;
        if (hour < 16) return 2;
        return 3;
    }
    
    private getSlotExpiresAt(slot: 1 | 2 | 3): Date {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        switch (slot) {
            case 1:
                tomorrow.setHours(8, 0, 0, 0);
                break;
            case 2:
                tomorrow.setHours(16, 0, 0, 0);
                break;
            case 3:
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                break;
        }
        
        return tomorrow;
    }
}