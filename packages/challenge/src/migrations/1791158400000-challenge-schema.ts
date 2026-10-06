import type { SqlMigration } from "@core/database";

export const initialChallengeSchema: SqlMigration = {
  timestamp: 1791158400000,
  name: "InitialChallengeSchema1791158400000",
  expectedTables: [
    "challenge_enrollment",
    "challenge_activity",
    "challenge_deleted_user",
  ],
  statements: [
    {
      text: `CREATE TABLE challenge_enrollment (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL, request_id uuid NOT NULL,
      kind varchar(32) NOT NULL CHECK (kind IN ('NEIGHBORHOOD_EXPLORER', 'WALK_DIARY')),
      title varchar(100) NOT NULL, target_count integer NOT NULL CHECK (target_count > 0),
      reward_code varchar(64) NOT NULL, policy_version integer NOT NULL CHECK (policy_version > 0),
      joined_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, settles_at timestamptz NOT NULL,
      cancelled_at timestamptz, is_current boolean NOT NULL,
      CONSTRAINT uq_challenge_request UNIQUE (user_id, request_id),
      CHECK (joined_at < ends_at AND ends_at < settles_at),
      CHECK (cancelled_at IS NULL OR is_current = false)
    )`,
    },
    {
      text: "CREATE UNIQUE INDEX uq_challenge_current ON challenge_enrollment (user_id, kind) WHERE is_current = true",
    },
    {
      text: "CREATE INDEX ix_challenge_user_joined ON challenge_enrollment (user_id, joined_at)",
    },
    {
      text: `CREATE TABLE challenge_activity (
      user_id varchar(26) NOT NULL, kind varchar(8) NOT NULL CHECK (kind IN ('WALK', 'DIARY')),
      source_id varchar(128) NOT NULL, revision integer NOT NULL CHECK (revision > 0),
      deleted boolean NOT NULL, walk_id varchar(128), facts jsonb, occurred_at timestamptz,
      received_at timestamptz NOT NULL, qualifying_received_at timestamptz,
      PRIMARY KEY (user_id, kind, source_id),
      CHECK ((deleted = true AND facts IS NULL AND qualifying_received_at IS NULL)
        OR (deleted = false AND facts IS NOT NULL AND occurred_at IS NOT NULL AND walk_id IS NOT NULL))
    )`,
    },
    {
      text: "CREATE INDEX ix_challenge_activity_time ON challenge_activity (user_id, occurred_at)",
    },
    {
      text: "CREATE TABLE challenge_deleted_user (user_id varchar(26) PRIMARY KEY)",
    },
  ],
};
