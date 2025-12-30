import { MainAreaCode } from '@core/database';
import { Field, Float, InputType } from '@nestjs/graphql';
import { IsString, Matches } from 'class-validator';

@InputType()
export class SetMainAreaInput {
  @Field(() => String)
  @IsString()
  @Matches(/^\d{2}(\d{3})?$/, { message: 'code must be 2 digits (시/도) or 5 digits (시/군/구).' })
  code: MainAreaCode;
}

@InputType()
export class SetLocationInput {
  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;
}


