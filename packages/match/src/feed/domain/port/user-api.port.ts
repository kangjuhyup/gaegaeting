import { User } from '../model/vo/user.js';
export abstract class UserApiPort {
    abstract getUser(userId:string) : Promise<User>
}