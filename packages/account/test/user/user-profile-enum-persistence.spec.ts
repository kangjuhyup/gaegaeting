import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import {
  MikroORM,
  MIKRO_USER_ENTITIES,
  UserProfileOrmEntity,
  UserProfileStatus,
  UserReportOrmEntity,
  UserReportStatus,
  UserReportType,
  buildMikroPostgresOptions,
} from "@core/database/mikro";
import {
  UserGender,
  UserRegion,
} from "../../src/user/domain/enum/user.enum.js";
import { UserProfileEntity } from "../../src/user/domain/model/user-profile.js";
import { UserProfileOrmMapper } from "../../src/user/infrastructure/adapter/outbound/persistence/mapper/user-profile-orm.js";
import { UserProfileOrmRepository } from "../../src/user/infrastructure/adapter/outbound/persistence/user-profile-orm.repository.js";
import { initialAccountSchema } from "../../src/migrations/0001-account-schema.js";

const states = Object.values(UserProfileStatus);
const profile = (
  status: UserProfileStatus,
  id = "01JPROFILEENUMFIXTURE000000",
) =>
  UserProfileEntity.of(
    {
      name: "Synthetic fixture",
      nickname: "Before",
      gender: UserGender.FEMALE,
      birthDate: new Date("1996-05-14T00:00:00Z"),
      region: UserRegion.SEOUL,
      bio: "Before",
      status,
    },
    id,
  );
const config = (url?: URL) =>
  new ConfigService({
    DATABASE_HOST: url?.hostname ?? "127.0.0.1",
    DATABASE_PORT: Number(url?.port || 5432),
    DATABASE_USERNAME: url ? decodeURIComponent(url.username) : "metadata",
    DATABASE_PASSWORD: url ? decodeURIComponent(url.password) : "metadata",
    DATABASE_NAME: url?.pathname.slice(1) ?? "metadata-only",
    DATABASE_LOG: false,
  });

describe("Profile value enums through real MikroORM assignment", () => {
  let orm: MikroORM;
  beforeAll(async () => {
    orm = await MikroORM.init({
      ...buildMikroPostgresOptions(config(), [...MIKRO_USER_ENTITIES]),
      connect: false,
    });
  });
  afterAll(async () => {
    await orm?.close(true);
  });

  test.each(states)(
    "accepts mapped $label status without treating it as a string",
    (status) => {
      const em = orm.em.fork();
      const current = em.create(
        UserProfileOrmEntity,
        UserProfileOrmMapper.toOrm(profile(status)),
      );
      current.createdAt = new Date("2026-01-01T00:00:00Z");
      current.updatedAt = current.createdAt;
      const domain = UserProfileOrmMapper.toDomain(current);
      domain.updateInfo({ nickname: "After", bio: "After" });
      em.assign(current, UserProfileOrmMapper.toOrm(domain));
      expect(current.nickname).toBe("After");
      expect(current.status).toEqual(status);
      expect(UserProfileOrmMapper.toDomain(current).status).toEqual(status);
    },
  );

  test("also accepts report status/type objects that share the custom type", () => {
    const em = orm.em.fork();
    const report = new UserReportOrmEntity();
    em.assign(report, {
      reportType: UserReportType.OTHER,
      status: UserReportStatus.PENDING,
    });
    expect(report.reportType).toEqual(UserReportType.OTHER);
    expect(report.status).toEqual(UserReportStatus.PENDING);
  });
});

const databaseUrl = process.env.ACCOUNT_TEST_DATABASE_URL;
const postgresSuite = databaseUrl ? describe : describe.skip;
postgresSuite(
  "Profile edits preserve status through PostgreSQL repository round trips",
  () => {
    const schema = `profile_enum_${randomUUID().replaceAll("-", "")}`;
    let orm: MikroORM;
    beforeAll(async () => {
      orm = await MikroORM.init({
        ...buildMikroPostgresOptions(config(new URL(databaseUrl!)), [
          ...MIKRO_USER_ENTITIES,
        ]),
        schema,
      });
      const connection = orm.em.getConnection();
      await connection.execute(`CREATE SCHEMA "${schema}"`);
      const tables = [...orm.getMetadata().getAll().values()].map(
        (meta) => meta.tableName,
      );
      for (const statement of initialAccountSchema.statements) {
        let sql = statement.text;
        for (const table of tables)
          sql = sql.replaceAll(`"${table}"`, `"${schema}"."${table}"`);
        await connection.execute(sql);
      }
    });
    afterAll(async () => {
      if (!orm) return;
      try {
        await orm.em
          .getConnection()
          .execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await orm.close(true);
      }
    });

    test.each(states)(
      "persists an edit and retains $label after clearing the identity map",
      async (status) => {
        const repository = () => new UserProfileOrmRepository(orm.em.fork());
        const owner = profile(
          status,
          randomUUID().replaceAll("-", "").slice(0, 26),
        );
        const other = profile(
          UserProfileStatus.ACTIVE,
          randomUUID().replaceAll("-", "").slice(0, 26),
        );
        await repository().insertUserProfile(owner);
        await repository().insertUserProfile(other);
        const loaded = await repository().selectUserProfileFromId(owner.id);
        loaded.updateInfo({
          nickname: "Edited",
          region: UserRegion.JEJU,
          bio: "Saved edit",
        });
        const updated = await repository().updateUserProfile(loaded);
        expect(updated.status).toEqual(status);
        const reloaded = await repository().selectUserProfileFromId(owner.id);
        expect(reloaded).toMatchObject({
          nickname: "Edited",
          region: UserRegion.JEJU,
          bio: "Saved edit",
          status,
        });
        const [raw] = await orm.em
          .getConnection()
          .execute(
            `SELECT status FROM "${schema}"."user_profile" WHERE id = ?`,
            [owner.id],
          );
        expect(raw.status).toBe(status.value);
        const unchanged = await repository().selectUserProfileFromId(other.id);
        expect(unchanged).toMatchObject({
          nickname: "Before",
          bio: "Before",
          status: UserProfileStatus.ACTIVE,
        });
        reloaded.updateInfo({ nickname: "Edited again" });
        await repository().updateUserProfile(reloaded);
        expect(
          (await repository().selectUserProfileFromId(owner.id)).nickname,
        ).toBe("Edited again");
      },
    );
  },
);
