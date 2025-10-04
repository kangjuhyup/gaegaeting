import { ApiProperty } from "@nestjs/swagger"

export class VerifyOptMessageResponse {

    @ApiProperty()
    readonly success : boolean
    
    @ApiProperty()
    readonly remainingAttempts: number;

    constructor(success: boolean, remainingAttempts?: number) {
        this.success = success;
        this.remainingAttempts = remainingAttempts;
    }
}