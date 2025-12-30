import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateFeedCommand } from "../../port/command/create-feed.port";
import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";
import { YYYYMMDD } from "@core/util";
import { Transactional } from "@core/database";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { ClockPort } from "@app/feed/application/port/clock.port";

@CommandHandler(CreateFeedCommand)
export class CreateFeedCommandHandler implements ICommandHandler<CreateFeedCommand,FeedEntity> {
    
    constructor(
        private readonly feedRepository: FeedRepositoryPort,
        private readonly feedItemRepository: FeedItemRepositoryPort,
        private readonly locationRepository: LocationRepositoryPort,
        private readonly clock: ClockPort,
    ) {}
    
    @Transactional()
    async execute(command: CreateFeedCommand): Promise<FeedEntity> {
        const now = this.clock.now();
        const today = new YYYYMMDD(now);
        const currentSlot = this.getCurrentSlot(now);
        const expiresAt = this.getSlotExpiresAt(now, currentSlot);
        
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
        const rawTargets = await this.locationRepository.findNearbyTargets(
            command.user.userId,
            userLocation.latitude,
            userLocation.longitude,
            today,
            2,
        );
        // DailyFeed 기준: 최대 2명, 중복 제거, 자기 자신 제외
        const targets = Array.from(
            new Set((rawTargets ?? []).filter((id) => id && id !== command.user.userId)),
        ).slice(0, 2);
        
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
    
    private getCurrentSlot(now: Date): 1 | 2 | 3 {
        const hour = now.getHours();
        if (hour < 8) return 1;
        if (hour < 16) return 2;
        return 3;
    }
    
    private getSlotExpiresAt(now: Date, slot: 1 | 2 | 3): Date {
        const tomorrow = new Date(now.getTime());
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