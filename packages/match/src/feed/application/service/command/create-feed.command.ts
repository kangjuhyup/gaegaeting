import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { CreateFeedCommand } from "../../port/command/create-feed.port.js";
import { FeedEntity } from "#app/feed/domain/model/feed";
import { FeedRepositoryPort } from "#app/feed/domain/port/feed.repository.port";
import { FeedItemRepositoryPort } from "#app/feed/domain/port/feed-item.repository.port";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { Transactional } from "@core/database";
import { FeedItemEntity } from "#app/feed/domain/model/feed-item";
import { ClockPort } from "#app/feed/application/port/clock.port";
import { getDailyFeedDate, getDailyFeedExpiresAt, getDailyFeedSlot } from "#app/feed/domain/daily-feed-policy";

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
        const today = getDailyFeedDate(now);
        const currentSlot = getDailyFeedSlot(now);
        const expiresAt = getDailyFeedExpiresAt(today);
        
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
    
}
