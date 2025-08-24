import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ReportPairBody {
    @ApiProperty({ description : '신고사유' })
    @IsNotEmpty()
    @IsString()
    reason : string;
}