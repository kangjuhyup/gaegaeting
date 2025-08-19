import { ItemReader } from "../../interface/reader";
import { LocationEntity } from "@app/location/domain/model/location";
import { LocationOrmEntity } from "@core/database";
import { DataSource } from "typeorm";

export class DailyFeedReader implements ItemReader<LocationEntity> {
    private buffer : LocationEntity[] = [];
    private cursor : string | null = null;
    private end = false;

    constructor(
        private readonly ds : DataSource,
        private readonly pageSize = 1000
    ) {}

    async read() : Promise<LocationEntity | null> {
        if(this.end) return null;
        if(this.buffer.length === 0) {
            const rows = await this.ds.createQueryBuilder()
            .select('user_id','userId')
            .addSelect('latitude','latitude')
            .addSelect('longitude','longitude')
            .from(LocationOrmEntity,'location')
            .where('location.userId > :cursor', { cursor: this.cursor })
            .orderBy('location.userId', 'ASC')
            .take(this.pageSize)
            .getRawMany();

            if(rows.length === 0) {
                this.end = true;
                return null;
            }

            this.buffer = rows.map(row => LocationEntity.of({
                latitude : row.latitude,
                longitude : row.longitude,
            }).setPersistence(row.userId,row.createdAt,row.updatedAt));

            this.cursor = this.buffer[this.buffer.length - 1].id;

            if(this.buffer.length < this.pageSize) this.end = true;
           
        }

        return this.buffer.shift();
    }
}