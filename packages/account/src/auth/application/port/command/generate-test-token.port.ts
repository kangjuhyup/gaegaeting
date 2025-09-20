import { AuthEntity } from "@app/auth/domain/model/auth";
import { Command } from "@nestjs/cqrs";

export class GenerateTestTokenCommand extends Command<string> {
    constructor(
        public readonly userId: string
    ) {
        super();
    }
}