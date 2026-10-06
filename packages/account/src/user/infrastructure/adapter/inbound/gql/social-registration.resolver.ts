import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { SocialAccountSignupService } from "../../../../application/service/social-account-signup.service.js";
import { RegisterSocialAccountInput } from "./dto/social-registration.input.js";
import { RegisteredAuthAccount } from "./dto/registration.type.js";

@Resolver()
export class SocialRegistrationResolver {
  constructor(private readonly signup: SocialAccountSignupService) {}

  @Mutation(() => RegisteredAuthAccount)
  registerSocialAccount(
    @Args("input") input: RegisterSocialAccountInput,
  ): Promise<RegisteredAuthAccount> {
    return this.signup.register(input);
  }
}
