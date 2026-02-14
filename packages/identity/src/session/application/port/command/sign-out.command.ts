import { Command } from "@nestjs/cqrs";

export class SignOutCommand extends Command<boolean> {
  constructor(public readonly userId: string) {
    super();
  }
}
