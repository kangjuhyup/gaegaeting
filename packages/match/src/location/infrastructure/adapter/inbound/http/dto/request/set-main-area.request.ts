import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SetMainAreaBody {

    @ApiProperty({ description : '지역코드' })
    @IsNotEmpty()
    @IsString()
    readonly code : string;

    @ApiProperty({ description : '지역이름' })
    @IsNotEmpty()
    @IsString()
    readonly name : string;

    @ApiProperty({ description : '지역상위코드' })
    @IsOptional()
    @IsString()
    readonly parentCode? : string;
}