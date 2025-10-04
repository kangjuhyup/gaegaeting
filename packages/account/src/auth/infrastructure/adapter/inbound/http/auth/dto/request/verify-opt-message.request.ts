import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class VerifyOptMessageBody {

    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('KR')
    phoneNumber : string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    opt : string
}