import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetMainAreaQuery } from "../../port/query/get-main-area.port";
import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { MainAreaRepositoryPort } from "@app/location/domain/port/main-area.repository.port";

@QueryHandler(GetMainAreaQuery)
export class GetMainAreaHandler implements IQueryHandler<GetMainAreaQuery, MainAreaEntity> {
    
    constructor(
        private readonly mainAreaRepositoryPort : MainAreaRepositoryPort
    ) {}

    async execute(query: GetMainAreaQuery): Promise<MainAreaEntity> {
        return await this.mainAreaRepositoryPort.selectMainAreaFromUserId(query.user.userId)
    }
}