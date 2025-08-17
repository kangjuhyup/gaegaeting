import { PresignedUrl } from "@app/common/vo/presigned-url";
import { Command } from "@nestjs/cqrs";

export class GenerateUserPresignedCommand extends Command<PresignedUrl> {
    constructor(
        public readonly userId : string,
        public readonly no : number,
    ) {
        super();
    }
}