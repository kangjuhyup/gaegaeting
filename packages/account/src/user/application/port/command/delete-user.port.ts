import { Command } from "@nestjs/cqrs";

export class DeleteUserCommand extends Command<boolean> {
  constructor(public readonly id: string) {
    super();
  }
}
