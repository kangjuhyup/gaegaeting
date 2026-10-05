import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import type { ActivityKind } from "../../domain/activity.js";

class ActivityFactsInput {
  @Matches(/^[A-Za-z0-9_-]{1,128}$/) walkId!: string;
  @IsISO8601() walkStartedAt!: string;
  @IsISO8601() walkEndedAt!: string;
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  distanceMeters!: number;
  @IsOptional() @Matches(/^[A-Za-z0-9_-]{1,128}$/) routeId?: string | null;
  @IsOptional() @Matches(/^[A-Za-z0-9_-]{1,26}$/) routeAuthorId?: string | null;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsISO8601() diarySavedAt?: string;
  @IsOptional() @IsBoolean() hasPhoto?: boolean;
  @IsOptional() @IsString() @MaxLength(50) mood?: string | null;
}

export class ActivityInput {
  @Matches(/^[A-Za-z0-9_-]{1,26}$/) userId!: string;
  @IsIn(["WALK", "DIARY"]) kind!: ActivityKind;
  @Matches(/^[A-Za-z0-9_-]{1,128}$/) sourceId!: string;
  @IsInt() @Min(1) @Max(2_147_483_647) revision!: number;
  @IsBoolean() deleted!: boolean;
  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityFactsInput)
  facts!: ActivityFactsInput | null;
}
