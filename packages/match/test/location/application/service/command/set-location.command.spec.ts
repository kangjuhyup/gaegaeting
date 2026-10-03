import { jest } from "@jest/globals";
import type { UserPrincipal } from "@core/auth";
import { bindTransactionBoundaryForTest } from "@core/database/testing";
import { SetLocationCommand } from "#app/location/application/port/command/set-location.port";
import { SetLocationHandler } from "#app/location/application/service/command/set-location.command";
import { LocationEntity } from "#app/location/domain/model/location";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";

const user = { userId: "viewer" } as UserPrincipal;

describe("현재 위치 저장", () => {
  let repository: jest.Mocked<LocationRepositoryPort>;
  let handler: SetLocationHandler;

  beforeEach(() => {
    repository = {
      selectLocationFromUserId: jest.fn(),
      saveLocation: jest.fn(),
      findNearbyTargets: jest.fn(),
    };
    repository.saveLocation.mockImplementation(async (location) => location);
    handler = new SetLocationHandler(repository);
    bindTransactionBoundaryForTest(handler, {
      owner: "test",
      run: (work) => work(),
    });
  });

  it("처음 전달한 좌표를 로그인한 사용자의 위치로 저장한다", async () => {
    repository.selectLocationFromUserId.mockResolvedValue(null);
    const input = LocationEntity.of({ latitude: 37.5, longitude: 127 });

    const result = await handler.execute(new SetLocationCommand(user, input));

    expect(result.id).toBe(user.userId);
    expect(result.latitude).toBe(37.5);
    expect(result.longitude).toBe(127);
    expect(repository.saveLocation).toHaveBeenCalledTimes(1);
  });

  it("이동 후 전달한 좌표로 갱신하고 기존 지역 정보와 생성 시각을 보존한다", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const existing = LocationEntity.of(
      {
        latitude: 35,
        longitude: 129,
        city: "서울",
        district: "강남구",
      },
      user.userId,
    ).setPersistence(user.userId, createdAt, createdAt);
    repository.selectLocationFromUserId.mockResolvedValue(existing);

    const result = await handler.execute(
      new SetLocationCommand(
        user,
        LocationEntity.of({ latitude: 37.5, longitude: 127 }),
      ),
    );

    expect(result.latitude).toBe(37.5);
    expect(result.longitude).toBe(127);
    expect(result.city).toBe("서울");
    expect(result.district).toBe("강남구");
    expect(result.createdAt).toEqual(createdAt);
    expect(repository.saveLocation).toHaveBeenCalledWith(existing);
  });
});
