import { CommandHandler } from "@nestjs/cqrs";
import { SetMainAreaCommand } from "../../port/command/set-main-area.port";
import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { ICommandHandler } from "@nestjs/cqrs";
import { MainAreaRepositoryPort } from "@app/location/domain/port/main-area.repository.port";
import { KOREA_MAIN_AREA_TABLE, Transactional } from "@core/database";
import { DataSource } from "typeorm";

@CommandHandler(SetMainAreaCommand)
export class SetMainAreaHandler implements ICommandHandler<SetMainAreaCommand,MainAreaEntity> {
    
    constructor(
        private readonly mainAreaRepositoryPort : MainAreaRepositoryPort,
        private readonly dataSource: DataSource,
    ) {}

    private static readonly MAIN_AREA_BY_CODE = new Map(
        KOREA_MAIN_AREA_TABLE.map((r) => [r.code, r] as const),
    );

    @Transactional()
    async execute(command: SetMainAreaCommand): Promise<MainAreaEntity> {
        const row = SetMainAreaHandler.MAIN_AREA_BY_CODE.get(command.code);
        if (!row) {
            throw new Error(`Invalid main area code: ${command.code}`);
        }
        const mainArea = new MainAreaEntity({
            code : row.code,
            name : row.name,
            parentCode : row.parentCode ?? undefined
        },command.user.userId)
        return await this.mainAreaRepositoryPort.saveMainArea(mainArea)
    }
}