import { Command } from "@nestjs/cqrs";
import { PresignedUrl } from "@app/common/vo/presigned-url";

export class GeneratePetPresignedCommand extends Command<PresignedUrl> {
    constructor(
        public readonly petId : number,
        public readonly no : number,
    ) {
        super();
    }
}