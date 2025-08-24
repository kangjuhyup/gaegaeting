import { LocationEntity } from "@app/location/domain/model/location";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class SetLocationBody {

    @ApiProperty({ description : '위도' })
    @IsNotEmpty()
    @IsNumber()
    private readonly latitude : number;

    @ApiProperty({ description : '경도' })
    @IsNotEmpty()
    @IsNumber()
    private readonly longitude : number;

    toModel() : LocationEntity {
        return LocationEntity.of({
            latitude : this.latitude,
            longitude : this.longitude,
        })
    }
}