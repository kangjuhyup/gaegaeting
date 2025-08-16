import { PersistenceEntity } from '@core/model';
import { PetGender, PetBreed, PetSize, PetPersonality } from '../enum/pet.enum';
import { PetProfileEntity } from './pet-profile';

interface IPet {
  name: string;
  age: number;
  gender: PetGender;
  breed: PetBreed;
  size: PetSize;
  personalities: PetPersonality[];
  description: string;
  userId: string;
  profiles? : PetProfileEntity[]
}

export class PetEntity extends PersistenceEntity<number,IPet> {

  static of(param: IPet) {
    return new PetEntity(param);
  }
  /**
   * 강아지 정보 업데이트
   * 
   * @param name 강아지 이름
   * @param age 강아지 나이
   * @param breed 강아지 품종
   * @param size 강아지 크기
   * @param personalities 강아지 성격 특성 배열
   * @param description 강아지 설명
   */
  updateInfo(
    name?: string,
    age?: number,
    breed?: PetBreed,
    size?: PetSize,
    personalities?: PetPersonality[],
    description?: string,
  ): void {
    if (name !== undefined) this.etc.name = name;
    if (age !== undefined) this.etc.age = age;
    if (breed !== undefined) this.etc.breed = breed;
    if (size !== undefined) this.etc.size = size;
    if (personalities !== undefined) this.etc.personalities = personalities;
    if (description !== undefined) this.etc.description = description;
  }


  // Getters
  get name(): string { return this.etc.name; }
  get age(): number { return this.etc.age; }
  get gender(): PetGender { return this.etc.gender; }
  get breed(): PetBreed { return this.etc.breed; }
  get size(): PetSize { return this.etc.size; }
  get personalities(): PetPersonality[] { return [...this.etc.personalities]; }
  get description(): string { return this.etc.description; }
  get userId(): string { return this.etc.userId; }
}
