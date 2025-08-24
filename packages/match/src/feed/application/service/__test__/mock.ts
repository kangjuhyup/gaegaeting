import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { UserApiPort } from "@app/feed/domain/port/user-api.port";
import { PetApiPort } from "@app/feed/domain/port/pet-api.port";

export const mockFeedRepsitoryPort = {
    getMyFeedWithItems : jest.fn()
} as jest.Mocked<FeedRepositoryPort>

export const mockFeedItemRepositoryPort = {
    getFeedItemFromId : jest.fn(),
    updateFeedItem : jest.fn()
} as jest.Mocked<FeedItemRepositoryPort>

export const mockUserApiPort = {
    getUser: jest.fn()
} as jest.Mocked<UserApiPort>

export const mockPetApiPort = {
    getPetsFromUser: jest.fn()
} as jest.Mocked<PetApiPort>
