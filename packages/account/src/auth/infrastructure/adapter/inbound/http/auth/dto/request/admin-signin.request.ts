import { IsNotEmpty, IsString } from "class-validator"

export class AdminSigninRequestBody {
    @IsString()
    @IsNotEmpty()
    id : string

    @IsString()
    @IsNotEmpty()
    password : string
}