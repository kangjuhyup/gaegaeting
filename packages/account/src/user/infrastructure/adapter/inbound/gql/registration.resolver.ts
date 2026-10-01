import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { RegistrationService } from "../../../../application/service/registration.service.js";
import { CompleteMockIdentityVerificationInput } from "./dto/registration.input.js";
import { RegistrationHandoff } from "./dto/registration.type.js";
import { AccountSignupService } from "../../../../application/service/account-signup.service.js";
import { RegisterAccountInput } from "./dto/registration.input.js";
import { RegisteredAuthAccount } from "./dto/registration.type.js";

@Resolver()
export class RegistrationResolver {
  constructor(
    private readonly registrations: RegistrationService,
    private readonly signup: AccountSignupService,
  ) {}

  @Mutation(() => RegistrationHandoff)
  completeMockIdentityVerification(
    @Args("input") input: CompleteMockIdentityVerificationInput,
  ): Promise<RegistrationHandoff> {
    return this.registrations.completeMockVerification(input);
  }

  @Mutation(() => RegisteredAuthAccount)
  registerAccount(
    @Args("input") input: RegisterAccountInput,
  ): Promise<RegisteredAuthAccount> {
    return this.signup.register(input);
  }
}
