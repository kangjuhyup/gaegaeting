import { type ItemProcessor } from "#app/batch/interface/processor";
import { LocationEntity } from "#app/location/domain/model/location";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { YYYYMMDD } from "@core/util";

export interface Candidate {
  viewerId: string;
  targets: string[];
}

export class DailyFeedProcessor implements ItemProcessor<
  LocationEntity,
  Candidate
> {
  constructor(
    private readonly locationRepository: LocationRepositoryPort,
    private readonly date: YYYYMMDD,
  ) {}

  async process(item: LocationEntity): Promise<Candidate | null> {
    const targets = await this.locationRepository.findNearbyTargets(
      item.id,
      item.latitude,
      item.longitude,
      this.date,
      2,
    );
    return targets.length === 0 ? null : { viewerId: item.id, targets };
  }
}
