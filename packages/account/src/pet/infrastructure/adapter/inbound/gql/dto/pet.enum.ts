import { registerEnumType } from '@nestjs/graphql';

export enum PetGenderGql {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum PetSizeGql {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum PetBreedGql {
  MALTESE = 'MALTESE',
  POODLE = 'POODLE',
  CHIHUAHUA = 'CHIHUAHUA',
  POMERANIAN = 'POMERANIAN',
  SHIH_TZU = 'SHIH_TZU',
  YORKSHIRE = 'YORKSHIRE',
  BEAGLE = 'BEAGLE',
  GOLDEN_RETRIEVER = 'GOLDEN_RETRIEVER',
  LABRADOR = 'LABRADOR',
  HUSKY = 'HUSKY',
  SAMOYED = 'SAMOYED',
  WELSH_CORGI = 'WELSH_CORGI',
  JINDO = 'JINDO',
  MIXED = 'MIXED',
  OTHER = 'OTHER',
}

export enum PetPersonalityGql {
  FRIENDLY = 'FRIENDLY',
  SHY = 'SHY',
  ACTIVE = 'ACTIVE',
  CALM = 'CALM',
  PLAYFUL = 'PLAYFUL',
  PROTECTIVE = 'PROTECTIVE',
  CURIOUS = 'CURIOUS',
  INDEPENDENT = 'INDEPENDENT',
}

registerEnumType(PetGenderGql, { name: 'PetGender' });
registerEnumType(PetSizeGql, { name: 'PetSize' });
registerEnumType(PetBreedGql, { name: 'PetBreed' });
registerEnumType(PetPersonalityGql, { name: 'PetPersonality' });


