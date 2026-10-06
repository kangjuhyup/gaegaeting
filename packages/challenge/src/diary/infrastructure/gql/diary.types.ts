import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
} from "@nestjs/graphql";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

@ObjectType("WalkingPhoto")
export class WalkingPhotoType {
  @Field(() => ID) id!: string;
  @Field() status!: string;
  @Field(() => String, { nullable: true }) url!: string | null;
  @Field(() => Int) expiresIn!: number;
}
@ObjectType("WalkingPhotoUpload")
export class WalkingPhotoUploadType {
  @Field(() => ID) id!: string;
  @Field() uploadUrl!: string;
  @Field(() => Int) expiresIn!: number;
  @Field(() => Int) maxBytes!: number;
  @Field(() => Int) maxDimension!: number;
}
@ObjectType("WalkingRouteDiaryReview")
export class WalkingRouteDiaryReviewType {
  @Field(() => ID) id!: string;
  @Field() authorName!: string;
  @Field() content!: string;
  @Field(() => String, { nullable: true }) mood!: string | null;
  @Field() walkDate!: string;
  @Field(() => [WalkingPhotoType]) photos!: WalkingPhotoType[];
}
@ObjectType("MyWalkingDiary")
export class MyWalkingDiaryType extends WalkingRouteDiaryReviewType {
  @Field(() => ID) walkId!: string;
  @Field(() => ID, { nullable: true }) routeId!: string | null;
  @Field() visibility!: string;
  @Field(() => Int) revision!: number;
  @Field(() => GraphQLISODateTime) savedAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
@InputType()
export class SaveWalkingDiaryInput {
  @Field(() => ID) @IsString() walkId!: string;
  @Field(() => Int) @IsInt() @Min(0) expectedRevision!: number;
  @Field({ defaultValue: "" }) @IsString() @MaxLength(5000) content!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mood?: string;
  @Field(() => [ID], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  photoIds!: string[];
  @Field({ defaultValue: "PRIVATE" }) @IsIn(["PRIVATE", "PUBLIC"]) visibility!:
    | "PRIVATE"
    | "PUBLIC";
}
