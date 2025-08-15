import { AuthProvider } from "@core/auth";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer"
import { IsNotEmpty, IsEnum, IsNumber, Min, MinLength, IsString } from 'class-validator';

export class GetUserPrincipalRequest {

    @ApiProperty({ 
        enum: () => Object.entries(AuthProvider).map(([key, value]) => value), 
        description: '소셜 로그인 제공자'
    })
    @IsNotEmpty({ message: '소셜 로그인 제공자는 필수입니다.' })
    @Transform(({ value }) => Number(value))
    @IsNumber({},{ message : '잘못된 providerType 입니다.'})
    readonly providerType : AuthProvider;
    
    @ApiProperty({ type : () => String, description : '소셜 로그인 제공자 ID'})
    @IsString({ message : 'providerId 는 문자열이어야 합니다.'})
    @IsNotEmpty({ message : 'providerId 는 필수입니다.'})
    readonly providerId : string;
}