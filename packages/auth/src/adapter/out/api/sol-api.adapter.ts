import { Injectable, Logger } from "@nestjs/common";
import { SmsApiPort } from "../../../application/port/api/sms-api.port";
import { ConfigService } from "@nestjs/config";
import { SolapiMessageService } from "solapi";
import { ENV_KEY } from "@app/common/config/env.config";

@Injectable()
export class SolApiAdapter implements SmsApiPort {

    private readonly sender: string;
    private readonly solapi: SolapiMessageService;

    private readonly logger = new Logger(SolApiAdapter.name);

    constructor(private readonly configService: ConfigService) {
        this.solapi = new SolapiMessageService(
            this.configService.get(ENV_KEY.SOLAPI_KEY), 
            this.configService.get(ENV_KEY.SOLAPI_SECRET)
        );
        this.sender = this.configService.get(ENV_KEY.SOLAPI_SMS_SENDER);
    }

    async sendSms(phoneNumber: string, message: string): Promise<void> {
        this.logger.debug(`Sending SMS to ${phoneNumber}: ${message}`);
        const response = await this.solapi.send({
            type : 'SMS',
            to: phoneNumber,
            from: this.sender,
            text : message
        }).catch((err:Error) => {
            this.logger.error(err.stack)
            throw err;
        })
        this.logger.log(`SMS sent to ${phoneNumber}: ${response.groupInfo.status}`);
    }
}