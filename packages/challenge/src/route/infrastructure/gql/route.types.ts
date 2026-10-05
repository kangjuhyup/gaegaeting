import { Field, Float, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { WalkingCoordinateType } from "../../../walk/infrastructure/gql/walk.types.js";

@ObjectType("WalkingRoute")
export class WalkingRouteType {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() startPlace!: string;
  @Field() endPlace!: string;
  @Field() authorName!: string;
  @Field(() => [String]) petNames!: string[];
  @Field(() => [WalkingCoordinateType]) path!: WalkingCoordinateType[];
  @Field(() => [String]) tags!: string[];
  @Field(() => Int) distanceMeters!: number;
  @Field(() => Int) durationSeconds!: number;
  @Field() isLoop!: boolean;
  @Field(() => Int, { nullable: true }) nearbyMeters!: number | null;
  @Field() isMine!: boolean;
  @Field() bookmarked!: boolean;
  @Field(() => Int) walkerCount!: number;
}
@ObjectType("MyWalkingRoute")
export class MyWalkingRouteType extends WalkingRouteType {
  @Field(() => ID) sourceWalkId!: string;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) reviewReason!: string | null;
  @Field(() => Int) revision!: number;
}
@ObjectType("WalkingRouteReviewItem")
export class WalkingRouteReviewItemType {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() startPlace!: string;
  @Field() endPlace!: string;
  @Field(() => [String]) tags!: string[];
  @Field(() => [WalkingCoordinateType]) path!: WalkingCoordinateType[];
  @Field() status!: string;
  @Field(() => Int) revision!: number;
}
@ObjectType("WalkingRouteReport")
export class WalkingRouteReportType {
  @Field(() => ID) id!: string;
  @Field(() => ID) routeId!: string;
  @Field() reason!: string;
  @Field() detail!: string;
}
@InputType()
export class WalkingRouteDetailsInput {
  @Field() @IsString() title!: string;
  @Field() @IsString() description!: string;
  @Field() @IsString() startPlace!: string;
  @Field() @IsString() endPlace!: string;
  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
}
@InputType()
export class CreateWalkingRouteInput {
  @Field() @IsUUID() requestId!: string;
  @Field(() => ID) @IsString() walkId!: string;
  @Field(() => Int) @IsInt() fromIndex!: number;
  @Field(() => Int) @IsInt() toIndex!: number;
  @Field(() => WalkingRouteDetailsInput)
  @ValidateNested()
  @Type(() => WalkingRouteDetailsInput)
  details!: WalkingRouteDetailsInput;
}
@InputType()
export class WalkingRouteSearchInput {
  @Field(() => Float) @IsNumber() latitude!: number;
  @Field(() => Float) @IsNumber() longitude!: number;
  @Field(() => Int, { defaultValue: 3000 }) @IsInt() radiusMeters!: number;
  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isLoop?: boolean;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  minDistanceMeters?: number;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  maxDistanceMeters?: number;
  @Field(() => Int, { defaultValue: 20 }) @IsInt() limit!: number;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() offset!: number;
}
