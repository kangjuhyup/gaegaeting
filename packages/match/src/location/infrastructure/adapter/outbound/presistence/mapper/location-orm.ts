import { LocationEntity } from "@app/location/domain/model/location";
import { LocationOrmEntity } from "@core/database";

export class LocationOrmMapper {

    static toDomain(orm : LocationOrmEntity) : LocationEntity {
        return LocationEntity.of({
            latitude : orm.latitude,
            longitude : orm.longitude,
            city : orm.city,
            district : orm.district,
        }).setPersistence(orm.userId,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : LocationEntity) : LocationOrmEntity {

        const orm = new LocationOrmEntity();

        orm.userId = domain.id;
        orm.latitude = domain.latitude;
        orm.longitude = domain.longitude;
        orm.city = domain.city;
        orm.district = domain.district;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;

        return orm;
    }
}