import { LocationEntity } from "../model/location";

export abstract class LocationRepositoryPort {

    abstract saveLocation(location:LocationEntity): Promise<LocationEntity>

    abstract selectLocationFromUserId(userId:string): Promise<LocationEntity>
}