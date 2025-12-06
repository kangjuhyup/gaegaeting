import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator"

export class UpdateUserIdRequestBody {

    @IsNotEmpty()
    @IsNumber()
    providerType : number

    @IsNotEmpty()
    @IsString()
    providerId : string

    @IsNotEmpty()
    @IsUUID()
    userId : string
}