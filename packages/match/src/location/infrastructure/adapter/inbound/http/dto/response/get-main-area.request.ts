import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { ApiProperty } from "@nestjs/swagger";

export class GetMainAreaResponse {

    @ApiProperty({ description : '지역코드' })
    private readonly code : string;

    @ApiProperty({ description : '지역이름' })
    private readonly name : string;

    @ApiProperty({ description : '지역상위코드', nullable: true })
    private readonly parentCode? : string;

    constructor(
        code : string,
        name : string,
        parentCode : string,
    ) {
        this.code = code;
        this.name = name;
        this.parentCode = parentCode;
    }

    static fromModel(model:MainAreaEntity) : GetMainAreaResponse {
        return new GetMainAreaResponse(model.code,model.name,model.parentCode)
    }
}