import { EntityManager } from "typeorm";
import { ulid } from "ulid";
import {
  UserOrmEntity,
  AuthOrmEntity,
  PetOrmEntity,
  UserAttachmentOrmEntity,
  PetAttachmentOrmEntity,
  LocationOrmEntity,
  MainAreaOrmEntity,
} from "../entity";

/** 테스트용 공통 이미지 경로 (user-attachment / pet-attachment 동일) */
export const TEST_IMAGE_PATH = "/static/test/image.jpg";

type SeedOptions = {
  /** 생성할 사용자/인증 개수 (기본 1000) */
  count?: number;
  /** 펫 생성 여부 (기본 true: 짝수 사용자에 1마리 생성) */
  withPets?: boolean;
  /** 위치/권역 생성 여부 (기본 true: user 1명당 location/main_area 1개 생성) */
  withGeo?: boolean;
  /** 좌표 기준점 (서울 강남역 근방 기본) */
  center?: { lat: number; lng: number };
  /** 좌표 랜덤 반경(m) */
  radiusMeters?: number;
};

const SEOUL_PARENT = "SEOUL";
const DISTRICTS = [
  { code: "SEOUL-GANGNAM", name: "강남구" },
  { code: "SEOUL-SEOCHO",  name: "서초구" },
  { code: "SEOUL-SONGPA",  name: "송파구" },
  { code: "SEOUL-GWANAK",  name: "관악구" },
  { code: "SEOUL-MAPO",    name: "마포구" },
  { code: "SEOUL-JONGNO",  name: "종로구" },
];

function metersToDeg(lat: number, meters: number) {
  const dLat = meters / 111_000;
  const dLng = meters / (111_000 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLng };
}
function randInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * auth & user 기준 테스트 데이터 대량 생성 (기본 1000건)
 * - user: N 건
 * - auth: N 건 (provider=1, providerId=ulid 기반)
 * - user_attachment: 각 user 당 1건, path는 TEST_IMAGE_PATH로 통일
 * - pet: (옵션) 짝수 인덱스 사용자에 1건씩
 * - pet_attachment: 각 pet 당 1건, path는 TEST_IMAGE_PATH로 통일
 * - location: (옵션) user 1명당 1건 (STORED point 컬럼은 DB가 생성)
 * - main_area: (옵션) user 1명당 1건 (권장 스키마: PK = user_id)
 */
export async function seedAuthAndUsers(
  accountEm: EntityManager,
  matchEm : EntityManager,
  opts: SeedOptions = {},
): Promise<{
  userIds: string[];
  authKeys: Array<{ authProvider: number; authProviderId: string }>;
  petIds: number[];
}> {
  const count = opts.count ?? 1000;
  const withPets = opts.withPets ?? true;
  const withGeo = opts.withGeo ?? true;
  const center = opts.center ?? { lat: 37.4979, lng: 127.0276 }; // 강남역
  const radiusMeters = opts.radiusMeters ?? 2000;

  const now = new Date();

  // ---------- 1) USERS ----------
  const users: Array<Partial<UserOrmEntity>> = [];
  for (let i = 0; i < count; i++) {
    const id = ulid();
    users.push({
      id,
      name: `User_${i + 1}`,
      nickname: `nick_${i + 1}`,
      email: i % 3 === 0 ? `user${i + 1}@example.com` : null as any,
      passwordHash: null as any,
      gender: i % 2, // 0/1
      birthDate: new Date(1990, (i % 12), (i % 28) + 1),
      region: i % 5, // 0~4
      bio: i % 4 === 0 ? `Hello, I'm user ${i + 1}` : null as any,
      phoneNumber: i % 5 === 0 ? `010-0000-${(1000 + i).toString().slice(-4)}` : null as any,
      status: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  await accountEm.createQueryBuilder()
    .insert()
    .into(UserOrmEntity)
    .values(users)
    .execute();

  const userIds = users.map(u => u.id!) as string[];

  // ---------- 2) AUTHS ----------
  const auths: Array<Partial<AuthOrmEntity>> = userIds.map((uid, i) => ({
    authProvider: 1,
    authProviderId: `prov_${uid}`, // 유니크
    refreshToken: null,
    refreshTokenExpiresAt: null,
    lastLoginAt: now,
    lastLoginIp: `127.0.0.${(i % 200) + 1}`,
    lastLoginDevice: "test-device",
    lastLoginLocation: "Seoul",
    userId: uid,
    createdAt: now,
    updatedAt: now,
  }));

  await accountEm.createQueryBuilder()
    .insert()
    .into(AuthOrmEntity)
    .values(auths)
    .execute();

  const authKeys = auths.map(a => ({
    authProvider: a.authProvider!,
    authProviderId: a.authProviderId!,
  }));

  // ---------- 3) USER ATTACHMENTS (통일 경로) ----------
  const userAttachments: Array<Partial<UserAttachmentOrmEntity>> = userIds.map(uid => ({
    userId: uid,
    no: 0,
    path: TEST_IMAGE_PATH,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  await accountEm.createQueryBuilder()
    .insert()
    .into(UserAttachmentOrmEntity)
    .values(userAttachments)
    .execute();

  // ---------- 4) PETS (옵션) ----------
  const petsToInsert: Array<Partial<PetOrmEntity>> = [];
  if (withPets) {
    for (let i = 0; i < userIds.length; i++) {
      if (i % 2 === 0) { // 짝수 인덱스 사용자에 1마리씩
        petsToInsert.push({
          userId: userIds[i],
          name: `Puppy_${i + 1}`,
          age: (i % 12) + 1,
          gender: i % 2,        // 0/1
          breed: (i % 10) + 1,  // 1~10
          size: (i % 3) + 1,    // 1~3
          personalities: [(i % 5) + 1, ((i + 2) % 5) + 1],
          description: i % 4 === 0 ? "friendly" : null as any,
          certificationCode: null as any,
          certification: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  let petIds: number[] = [];
  if (petsToInsert.length > 0) {
    const insertRes = await accountEm.createQueryBuilder()
      .insert()
      .into(PetOrmEntity)
      .values(petsToInsert)
      .execute();
    petIds = insertRes.identifiers.map((x: any) => x.id as number);

    // ---------- 5) PET ATTACHMENTS (통일 경로) ----------
    const petAttachments: Array<Partial<PetAttachmentOrmEntity>> = petIds.map(pid => ({
      petId: pid,
      no: 0,
      path: TEST_IMAGE_PATH,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));
    await accountEm.createQueryBuilder()
      .insert()
      .into(PetAttachmentOrmEntity)
      .values(petAttachments)
      .execute();
  }

  // ---------- 6) GEO: LOCATION + MAIN_AREA (옵션) ----------
  if (withGeo) {
    // location (user 1:1)
    const locRows = userIds.map(uid => {
      const r = randInRange(0, radiusMeters);
      const theta = randInRange(0, Math.PI * 2);
      const { dLat, dLng } = metersToDeg(center.lat, r);
      const lat = center.lat + dLat * Math.cos(theta);
      const lng = center.lng + dLng * Math.sin(theta);
      const dist = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      return {
        userId: uid,
        latitude: Number(lat.toFixed(7)),
        longitude: Number(lng.toFixed(7)),
        city: "서울특별시",
        district: dist.name,
        createdAt: now,
        updatedAt: now,
      };
    });
    await matchEm.createQueryBuilder()
      .insert()
      .into(LocationOrmEntity)
      .values(locRows)
      .execute();

    // main_area (user 1:1) — 권장 스키마: PK = user_id
    const areaRows = userIds.map(uid => {
      const dist = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      return {
        userId: uid,         // ← PrimaryColumn user_id 가정
        code: dist.code,
        name: dist.name,
        parentCode: SEOUL_PARENT,
        createdAt: now,
        updatedAt: now,
      };
    });
    await matchEm.createQueryBuilder()
      .insert()
      .into(MainAreaOrmEntity)
      .values(areaRows)
      .execute();

    /* Fallback (스키마를 못 바꾸는 경우)
    // 만약 MainAreaOrmEntity가 PrimaryGeneratedColumn(user_id) 라면,
    // 1:1 매핑용으로 별도 컬럼을 추가해야 합니다. 예:
    // @Column({ type: 'char', length: 26, name: 'user_id_ref', unique: true })
    // userIdRef: string;
    //
    // 그런 후 아래에서 userId 대신 userIdRef로 삽입하세요.
    */
  }

  return { userIds, authKeys, petIds };
}