import { MainAreaEntity } from '../model/main-area';
export abstract class MainAreaRepositoryPort {

    abstract saveMainArea(mainArea:MainAreaEntity) : Promise<MainAreaEntity>

    abstract selectMainAreaFromUserId(userId:string) : Promise<MainAreaEntity | null>
}