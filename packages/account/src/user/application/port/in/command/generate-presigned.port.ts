import { ProfileEntity } from "@app/user/domain/model/profile";
import { PresignedUrl } from "@app/user/domain/vo/presigned-url";
import { Command } from "@nestjs/cqrs";

export class GeneratePresignedCommand extends Command<PresignedUrl> {
    constructor(
        public readonly userId : string,
        public readonly no : number,
    ) {
        super();
    }
}