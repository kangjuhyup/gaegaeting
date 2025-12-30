import { YYYYMMDD } from "@core/util";
import { LocationEntity } from "../model/location";

export abstract class LocationRepositoryPort {

    abstract saveLocation(location:LocationEntity): Promise<LocationEntity>

    abstract selectLocationFromUserId(userId:string): Promise<LocationEntity>

    abstract findNearbyTargets(
        userId: string,
        latitude: number,
        longitude: number,
        date: YYYYMMDD,
        maxTargets?: number,
    ): Promise<string[]>
}