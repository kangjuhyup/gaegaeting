import { InputType, Field, ObjectType, Int } from "@nestjs/graphql";

@InputType()
export class SignupInput {
  @Field()
  email!: string;

  @Field()
  username!: string;

  @Field()
  password!: string;
}

@InputType()
export class SigninInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}

@InputType()
export class LinkIdentityInput {
  @Field()
  provider!: string;

  @Field()
  idToken!: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;

  @Field(() => Int)
  expiresIn!: number;
}

@ObjectType()
export class Identity {
  @Field()
  provider!: string;

  @Field()
  subject!: string;
}
