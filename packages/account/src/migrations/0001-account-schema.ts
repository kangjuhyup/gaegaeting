import type { SqlMigration } from '@core/database';

export const initialAccountSchema: SqlMigration = {
  timestamp: 1788347565485,
  name: 'InitialAccountSchema1788347565485',
  expectedTables: ['user_attachment', 'user_profile', 'pet_attachment', 'pet', 'external_user_subject', 'user_report'],
  manifest: { sha256: 'e957f97e783275243001cfa719fac00470b43ef8c1ce7c704ca3e10694f3bdb2' },
  statements: [
    { text: `CREATE TABLE "user_attachment" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" character(26) NOT NULL, "no" integer NOT NULL DEFAULT '0', "path" character varying(255) NOT NULL, "is_active" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_c080dde438e42f99c72a081e574" PRIMARY KEY ("user_id", "no"))` },
    { text: `CREATE TABLE "user_profile" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" character(26) NOT NULL, "name" character varying(50) NOT NULL, "nickname" character varying(50) NOT NULL, "gender" smallint NOT NULL, "birth_date" date NOT NULL, "region" smallint NOT NULL, "bio" character varying(1000), "status" smallint NOT NULL DEFAULT '0', CONSTRAINT "PK_f44d0cd18cfd80b0fed7806c3b7" PRIMARY KEY ("id"))` },
    { text: `CREATE TABLE "pet_attachment" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "pet_id" integer NOT NULL, "no" integer NOT NULL DEFAULT '0', "path" character varying(255) NOT NULL, "is_active" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_1c74890f85222144edadf914a6e" PRIMARY KEY ("pet_id", "no"))` },
    { text: `CREATE TABLE "pet" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, "age" integer, "gender" smallint NOT NULL, "breed" smallint NOT NULL, "size" smallint NOT NULL, "personalities" text NOT NULL, "description" text, "certification_code" character, "certification" boolean NOT NULL DEFAULT false, "user_id" character(26) NOT NULL, CONSTRAINT "PK_b1ac2e88e89b9480e0c5b53fa60" PRIMARY KEY ("id"))` },
    { text: `CREATE TABLE "external_user_subject" ("user_id" character(26) NOT NULL, "tenant_id" character varying(128) NOT NULL, "subject" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uk_external_user_subject_tenant_sub" UNIQUE ("tenant_id", "subject"), CONSTRAINT "PK_7da1f1310c6cd258e95d01fa877" PRIMARY KEY ("user_id"))` },
    { text: `CREATE TABLE "user_report" ("id" SERIAL NOT NULL, "reporter_id" character(26) NOT NULL, "reported_user_id" character(26) NOT NULL, "report_type" smallint NOT NULL DEFAULT '4', "content" text, "status" smallint NOT NULL DEFAULT '0', "resolution" text, "resolved_by" character(26), "resolved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_58c08f0e20fa66561b119421eb2" PRIMARY KEY ("id"))` },
    { text: `ALTER TABLE "user_attachment" ADD CONSTRAINT "FK_3ce170fc809882ba254be591e9a" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` },
    { text: `ALTER TABLE "pet_attachment" ADD CONSTRAINT "FK_447efb21de244c3d43ea8ab26b0" FOREIGN KEY ("pet_id") REFERENCES "pet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` },
    { text: `ALTER TABLE "pet" ADD CONSTRAINT "FK_64704296b7bd17e90ca0a620a98" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` },
    { text: `ALTER TABLE "user_report" ADD CONSTRAINT "FK_dbee763adbfd464522d0f1bdc9a" FOREIGN KEY ("reporter_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` },
    { text: `ALTER TABLE "user_report" ADD CONSTRAINT "FK_e1a59610dd446c038093fc9fa1f" FOREIGN KEY ("reported_user_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION` },
  ],
};
