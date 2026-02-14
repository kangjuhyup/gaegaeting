import { SigninInput } from "@app/session/infrastructure/adapter/in/gql/dto/session.input";
import { Command } from "@nestjs/cqrs";
import { SigninOutput } from "../../dto/sigin-in.dto";

export class SigninCommand extends Command<SigninOutput> {
  constructor(
    public readonly input: SigninInput) {
    super();
  }
}
