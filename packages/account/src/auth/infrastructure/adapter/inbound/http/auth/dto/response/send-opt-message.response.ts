import { ApiProperty } from "@nestjs/swagger"

export class SendOptMessageResponse {

    @ApiProperty()
    readonly opt : string

    constructor(
        opt : string
    ) {
        this.opt = opt
    }
}