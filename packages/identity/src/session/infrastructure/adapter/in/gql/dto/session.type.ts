import { ObjectType, Field, ID } from "@nestjs/graphql";
import { UserStatus } from "./session,enum";

@ObjectType("User")
export class GraphQLUser {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field()
  email!: string;

  @Field(() => UserStatus)
  status!: UserStatus;

  @Field(() => [Identity])
  identities!: Identity[];
}
