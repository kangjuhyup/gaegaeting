import { User } from '../model/vo/user';
export abstract class UserApiPort {
    abstract getUser(userId:string) : Promise<User>
}