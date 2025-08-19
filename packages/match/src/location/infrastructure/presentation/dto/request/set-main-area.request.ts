import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SetMainAreaBody {

    @ApiProperty({ description : '지역코드' })
    @IsNotEmpty()
    @IsString()
    private readonly code : string;

    @ApiProperty({ description : '지역이름' })
    @IsNotEmpty()
    @IsString()
    private readonly name : string;

    @ApiProperty({ description : '지역상위코드' })
    @IsOptional()
    @IsString()
    private readonly parentCode? : string;

    toModel() : MainAreaEntity {
        return MainAreaEntity.of({
            code : this.code,
            name : this.name,
            parentCode : this.parentCode,
        })
    }
}