import type { SqlMigration } from '@core/database';

export const profileImageReviewMigration: SqlMigration = {
  timestamp: 1790899200000,
  name: 'ProfileImageReview1790899200000',
  expectedTables: [],
  statements: ['user_attachment', 'pet_attachment'].flatMap(table => [
    { text: `ALTER TABLE "${table}"
      ADD COLUMN "upload_key" character varying(255),
      ADD COLUMN "review_status" character varying(16) NOT NULL DEFAULT 'UPLOADING',
      ADD COLUMN "reviewed_by" character(26),
      ADD COLUMN "reviewed_at" TIMESTAMP WITH TIME ZONE` },
    { text: `UPDATE "${table}" SET "review_status" = 'APPROVED' WHERE "is_active" = true` },
    { text: `ALTER TABLE "${table}" ADD CONSTRAINT "ck_${table}_review" CHECK (
      "review_status" IN ('UPLOADING', 'PENDING', 'APPROVED', 'REJECTED')
      AND "is_active" = ("review_status" = 'APPROVED'))` },
    { text: `CREATE INDEX "ix_${table}_review_pending" ON "${table}" ("updated_at") WHERE "review_status" = 'PENDING'` },
  ]),
};
