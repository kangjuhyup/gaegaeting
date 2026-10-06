import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
} from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

@ObjectType("WalkingCoordinate")
export class WalkingCoordinateType {
  @Field(() => Float) latitude!: number;
  @Field(() => Float) longitude!: number;
}
@ObjectType("WalkingTrackPoint")
export class WalkingTrackPointType extends WalkingCoordinateType {
  @Field() recordedAt!: string;
  @Field(() => Float) accuracyMeters!: number;
  @Field(() => Int) segment!: number;
}
@ObjectType("WalkingSegment")
export class WalkingSegmentType {
  @Field() startedAt!: string;
  @Field(() => String, { nullable: true }) endedAt!: string | null;
}
@ObjectType("WalkingPet")
export class WalkingPetType {
  @Field(() => Int) id!: number;
  @Field() name!: string;
}
@ObjectType("WalkingRouteSnapshot")
export class WalkingRouteSnapshotType {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => [WalkingCoordinateType]) path!: WalkingCoordinateType[];
}
@ObjectType("WalkingRecord")
export class WalkingRecordType {
  @Field(() => ID) id!: string;
  @Field() requestId!: string;
  @Field() state!: string;
  @Field(() => [WalkingPetType]) pets!: WalkingPetType[];
  @Field(() => WalkingRouteSnapshotType, { nullable: true })
  route!: WalkingRouteSnapshotType | null;
  @Field(() => [WalkingTrackPointType]) points!: WalkingTrackPointType[];
  @Field(() => [WalkingSegmentType]) segments!: WalkingSegmentType[];
  @Field(() => GraphQLISODateTime) startedAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true }) endedAt!: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) finishedAt!: Date | null;
  @Field(() => Int) distanceMeters!: number;
  @Field(() => Float) coverage!: number;
  @Field() completed!: boolean;
  @Field(() => Int) revision!: number;
  @Field(() => Int) policyVersion!: number;
}
@ObjectType("WalkingPassportStamp")
export class WalkingPassportStampType {
  @Field(() => ID) routeId!: string;
  @Field() title!: string;
  @Field(() => Int) completedCount!: number;
}
@InputType()
export class StartWalkInput {
  @Field() @IsUUID() requestId!: string;
  @Field(() => [Int])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(1, { each: true })
  petIds!: number[];
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  routeId?: string;
}
@InputType()
export class WalkingTrackPointInput {
  @Field(() => Float) @IsNumber() latitude!: number;
  @Field(() => Float) @IsNumber() longitude!: number;
  @Field() @IsDateString() recordedAt!: string;
  @Field(() => Float) @IsNumber() accuracyMeters!: number;
  @Field(() => Int) @IsInt() @Min(0) segment!: number;
}
@InputType()
export class AppendWalkPointsInput {
  @Field(() => ID) @IsString() walkId!: string;
  @Field(() => Int) @IsInt() @Min(0) fromIndex!: number;
  @Field(() => [WalkingTrackPointInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WalkingTrackPointInput)
  points!: WalkingTrackPointInput[];
}
