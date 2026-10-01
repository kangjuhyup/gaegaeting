import { Field, GraphQLISODateTime, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class RegistrationHandoff {
  @Field() handoffId!: string;
  @Field(() => GraphQLISODateTime) expiresAt!: Date;
}

@ObjectType()
export class RegisteredAuthAccount {
  @Field() authSubject!: string;
}
