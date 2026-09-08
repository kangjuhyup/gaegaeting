import { IsBoolean, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ReviewUserImagesRequestBody {

    @IsNotEmpty()
    @IsString()
    path : string

    @IsNotEmpty()
    @IsBoolean()
    approve : boolean
}