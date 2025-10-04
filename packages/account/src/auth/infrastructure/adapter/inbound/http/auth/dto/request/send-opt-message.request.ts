import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsPhoneNumber } from "class-validator";

export class SendOptMessageBody {

    @ApiProperty()
    @IsNotEmpty()
    @IsPhoneNumber('KR')
    phoneNumber : string
}