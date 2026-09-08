import type { SqlMigration } from '../sql-migration.js';

export const initialChatSchema: SqlMigration = {
  timestamp: 1788347100000,
  name: 'InitialChatSchema1788347100000',
  expectedTables: [
    'conversation', 'message', 'message_attachment', 'message_reaction',
    'message_receipt', 'participant',
  ],
  manifest: { sha256: 'c96fafb542562bffe9e3102a808e33ac3f4042dbfb8493c3ee7a19c72961ca17' },
  statements: [{ text: `
create table "conversation" ("id" serial primary key, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "type" smallint not null, "direct_key" char(53) null, "title" varchar(128) null, "last_message_at" timestamptz null);
create index "ix_conv_type" on "conversation" ("type");
create index "ix_conv_last_msg_at" on "conversation" ("last_message_at");
alter table "conversation" add constraint "uq_conv_direct_key" unique ("direct_key");
create table "message" ("id" serial primary key, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "conversation_id" int not null, "sender_id" char(26) not null, "kind" smallint not null default '1', "body" text null, "payload" jsonb null, "sent_at" timestamptz not null default CURRENT_TIMESTAMP, "edited_at" timestamptz null, "deleted_at" timestamptz null);
create index "ix_msg_sender_time" on "message" ("sender_id", "sent_at");
create index "ix_msg_conv_id_desc" on "message" ("conversation_id", "id");
create table "message_attachment" ("id" serial primary key, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "message_id" int not null, "type" smallint not null, "mime" varchar(255) null, "size" int null, "storage_key" varchar(512) not null, "thumbnail_key" varchar(512) null, "width" int null, "height" int null, "length_sec" int null);
create index "ix_attach_msg" on "message_attachment" ("message_id");
create table "message_reaction" ("message_id" int not null, "user_id" char(26) not null, "emoji" varchar(32) not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "reacted_at" timestamptz not null default CURRENT_TIMESTAMP, primary key ("message_id", "user_id", "emoji"));
create table "message_receipt" ("message_id" int not null, "user_id" char(26) not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "delivered_at" timestamptz null, "read_at" timestamptz null, primary key ("message_id", "user_id"));
create table "participant" ("conversation_id" int not null, "user_id" char(26) not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "updated_at" timestamptz not null default CURRENT_TIMESTAMP, "role" smallint not null default '2', "last_read_message_id" bigint null, "last_read_at" timestamptz null, "muted_until" timestamptz null, "joined_at" timestamptz not null default CURRENT_TIMESTAMP, "left_at" timestamptz null, primary key ("conversation_id", "user_id"));
create index "ix_part_user" on "participant" ("user_id");
alter table "message" add constraint "FK_7fe3e887d78498d9c9813375ce2" foreign key ("conversation_id") references "conversation" ("id") on update no action on delete cascade;
alter table "message_attachment" add constraint "FK_9db9a64915214dde2ca1e8db9a7" foreign key ("message_id") references "message" ("id") on update no action on delete cascade;
alter table "message_reaction" add constraint "FK_c3aa2868fc9b2bc57d067642c58" foreign key ("message_id") references "message" ("id") on update no action on delete cascade;
alter table "message_receipt" add constraint "FK_d0a543b03e1ec2f0023ae3f4bb8" foreign key ("message_id") references "message" ("id") on update no action on delete cascade;
alter table "participant" add constraint "FK_9b5903f91fdde57571cc40ceafc" foreign key ("conversation_id") references "conversation" ("id") on update no action on delete cascade;
  ` }],
};
