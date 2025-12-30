import { PersistenceEntity } from '@core/model';
import { PetGender, PetBreed, PetSize, PetPersonality } from '../enum/pet.enum';
import { PetAttachemntEntity } from './pet-attachment';

interface IPet {
  name: string;
  age: number;
  gender: PetGender;
  breed: PetBreed;
  size: PetSize;
  personalities: PetPersonality[];
  description: string;
  userId: string;
  certificationCode? : string;
  certification : boolean;
  profiles? : PetAttachemntEntity[]
}

export class PetProfileEntity extends PersistenceEntity<number,IPet> {

  private constructor(param: IPet, id: number) {
    super(param, id);
  }

  static of(param: IPet, id?: number) {
    // 생성 경로에 따라 status가 null로 들어오는 케이스가 있어 기본값만 보정
    if (param.certification == null) {
        param.certification = false;
    }
    return new PetProfileEntity(param, id);
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
  updateInfo(update : {
    name?: string,
    age?: number,
    breed?: PetBreed,
    size?: PetSize,
    personalities?: PetPersonality[],
    description?: string,
    certificationCode?: string,
    certification?: boolean,
  }): void {
    if (update.name !== undefined) this.etc.name = update.name;
    if (update.age !== undefined) this.etc.age = update.age;
    if (update.breed !== undefined) this.etc.breed = update.breed;
    if (update.size !== undefined) this.etc.size = update.size;
    if (update.personalities !== undefined) this.etc.personalities = update.personalities;
    if (update.description !== undefined) this.etc.description = update.description;
    if (update.certificationCode !== undefined) this.etc.certificationCode = update.certificationCode;
    if (update.certification !== undefined) this.etc.certification = update.certification;
  }

  successCert() {
    this.etc.certification = true;
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
  get certificationCode() : string { return this.etc.certificationCode; }
  get isCertificated() : boolean { return this.etc.certification }
  get profile() : PetAttachemntEntity[] { return this.etc.profiles; }
}
