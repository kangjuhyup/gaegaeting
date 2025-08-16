import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";

@Controller()
export class UserConsumer {

    @MessagePattern('user.attachment.uploaded')
    processUploadedProfile() {
        
    }
}