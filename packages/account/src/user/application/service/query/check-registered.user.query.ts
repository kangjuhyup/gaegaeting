import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CheckRegisteredUserQuery } from '../../port/query/check-registered.user.port';
import { UserRegistered } from '@app/user/domain/model/vo/user-reisgetered';

@QueryHandler(CheckRegisteredUserQuery)
export class CheckRegisteredUserQueryHandler implements IQueryHandler<CheckRegisteredUserQuery,UserRegisted> {
    
    
    execute(query: CheckRegisteredUserQuery): Promise<UserRegistered> {
        throw new Error('Method not implemented.');
    }

}