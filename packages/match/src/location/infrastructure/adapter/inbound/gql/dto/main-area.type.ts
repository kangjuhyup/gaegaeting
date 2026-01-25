import { MainAreaEntity } from '@app/location/domain/model/main-area';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MainArea {
  @Field(() => String)
  code: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  parentCode?: string;

  static from(model: MainAreaEntity): MainArea {
    return {
      code: model.code,
      name: model.name,
      parentCode: model.parentCode,
    };
  }
}


