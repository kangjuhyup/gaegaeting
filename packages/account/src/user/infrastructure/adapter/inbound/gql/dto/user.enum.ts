import { registerEnumType } from '@nestjs/graphql';

export enum UserGenderGql {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum UserRegionGql {
  SEOUL = 'SEOUL',
  GYEONGGI = 'GYEONGGI',
  INCHEON = 'INCHEON',
  GANGWON = 'GANGWON',
  CHUNGCHEONG = 'CHUNGCHEONG',
  JEOLLA = 'JEOLLA',
  GYEONGSANG = 'GYEONGSANG',
  JEJU = 'JEJU',
}

export enum UserStatusGql {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

registerEnumType(UserGenderGql, { name: 'UserGender' });
registerEnumType(UserRegionGql, { name: 'UserRegion' });
registerEnumType(UserStatusGql, { name: 'UserStatus' });


