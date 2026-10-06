import type { SqlMigration } from "@core/database";

export const walkingContentSchema: SqlMigration = {
  timestamp: 1791187200000,
  name: "WalkingContent1791187200000",
  expectedTables: [
    "walking_record",
    "walking_route",
    "walking_diary",
    "walking_photo",
    "walking_route_bookmark",
    "walking_route_report",
    "walking_media_cleanup",
  ],
  statements: [
    {
      text: `CREATE TABLE walking_record (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL, request_id uuid NOT NULL,
      state varchar(16) NOT NULL CHECK (state IN ('RECORDING','PAUSED','FINISHED','DELETED')),
      author_name varchar(100) NOT NULL, pets jsonb NOT NULL, route_id varchar(26), route jsonb,
      points jsonb NOT NULL, segments jsonb NOT NULL,
      started_at timestamptz, ended_at timestamptz, finished_at timestamptz,
      distance_meters integer NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
      coverage double precision NOT NULL DEFAULT 0 CHECK (coverage BETWEEN 0 AND 1),
      completed boolean NOT NULL DEFAULT false, revision integer NOT NULL CHECK (revision > 0),
      policy_version integer NOT NULL,
      UNIQUE (user_id, request_id),
      CHECK (jsonb_array_length(points) <= 10000),
      CHECK (state = 'DELETED' OR started_at IS NOT NULL),
      CHECK (state <> 'FINISHED' OR (ended_at IS NOT NULL AND finished_at IS NOT NULL AND ended_at >= started_at AND finished_at >= ended_at))
    )`,
    },
    {
      text: "CREATE UNIQUE INDEX uq_walking_current ON walking_record(user_id) WHERE state IN ('RECORDING','PAUSED')",
    },
    {
      text: "CREATE INDEX ix_walking_owner_time ON walking_record(user_id, started_at DESC)",
    },
    {
      text: `CREATE TABLE walking_route (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL, request_id uuid NOT NULL,
      source_walk_id varchar(26) NOT NULL REFERENCES walking_record(id) ON DELETE CASCADE,
      title varchar(100) NOT NULL, description varchar(2000) NOT NULL,
      start_place varchar(100) NOT NULL, end_place varchar(100) NOT NULL,
      author_name varchar(100) NOT NULL, pet_names jsonb NOT NULL, path jsonb NOT NULL, tags jsonb NOT NULL,
      distance_meters integer NOT NULL CHECK (distance_meters BETWEEN 100 AND 50000), duration_seconds integer NOT NULL,
      is_loop boolean NOT NULL, start_latitude double precision NOT NULL, start_longitude double precision NOT NULL,
      status varchar(16) NOT NULL CHECK (status IN ('DRAFT','PENDING','PUBLISHED','REJECTED','WITHDRAWN')),
      review_reason varchar(500), revision integer NOT NULL CHECK (revision > 0),
      created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      UNIQUE (user_id, request_id), CHECK (jsonb_array_length(path) BETWEEN 2 AND 4000)
    )`,
    },
    {
      text: "CREATE INDEX ix_walking_route_public ON walking_route(status, start_latitude, start_longitude)",
    },
    {
      text: "ALTER TABLE walking_record ADD CONSTRAINT fk_walking_route FOREIGN KEY (route_id) REFERENCES walking_route(id) ON DELETE SET NULL",
    },
    {
      text: "CREATE INDEX ix_walking_completion ON walking_record(route_id, user_id) WHERE state = 'FINISHED' AND completed = true",
    },
    {
      text: `CREATE TABLE walking_diary (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL,
      walk_id varchar(26) NOT NULL UNIQUE REFERENCES walking_record(id) ON DELETE CASCADE,
      route_id varchar(26) REFERENCES walking_route(id) ON DELETE SET NULL,
      author_name varchar(100) NOT NULL, content varchar(5000) NOT NULL, mood varchar(50),
      photo_ids jsonb NOT NULL, visibility varchar(8) NOT NULL CHECK (visibility IN ('PRIVATE','PUBLIC')),
      walk_date varchar(10) NOT NULL, revision integer NOT NULL CHECK (revision > 0),
      saved_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
    )`,
    },
    {
      text: "CREATE UNIQUE INDEX uq_walking_public_review ON walking_diary(user_id, route_id) WHERE visibility = 'PUBLIC'",
    },
    {
      text: "CREATE INDEX ix_walking_diary_owner ON walking_diary(user_id, saved_at DESC)",
    },
    {
      text: `CREATE TABLE walking_photo (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL,
      walk_id varchar(26) NOT NULL REFERENCES walking_record(id) ON DELETE CASCADE,
      status varchar(12) NOT NULL CHECK (status IN ('UPLOADING','READY')),
      upload_key varchar(300) NOT NULL UNIQUE, object_key varchar(300) UNIQUE,
      created_at timestamptz NOT NULL, CHECK (status <> 'READY' OR object_key IS NOT NULL)
    )`,
    },
    {
      text: "CREATE INDEX ix_walking_photo_owner ON walking_photo(user_id, walk_id)",
    },
    {
      text: `CREATE TABLE walking_route_bookmark (
      user_id varchar(26) NOT NULL, route_id varchar(26) NOT NULL REFERENCES walking_route(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL, PRIMARY KEY (user_id, route_id)
    )`,
    },
    {
      text: `CREATE TABLE walking_route_report (
      id varchar(26) PRIMARY KEY, user_id varchar(26) NOT NULL,
      route_id varchar(26) NOT NULL REFERENCES walking_route(id) ON DELETE CASCADE,
      reason varchar(32) NOT NULL, detail varchar(500) NOT NULL, resolved boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL, UNIQUE (user_id, route_id)
    )`,
    },
    {
      text: `CREATE TABLE walking_media_cleanup (
      object_key varchar(300) PRIMARY KEY, not_before timestamptz NOT NULL,
      attempts integer NOT NULL DEFAULT 0
    )`,
    },
  ],
};
