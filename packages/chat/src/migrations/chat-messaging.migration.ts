import type { SqlMigration } from '@core/database';
export const chatMessagingMigration: SqlMigration = {
  timestamp: 1791014400000, name: 'ChatMessaging1791014400000', expectedTables: [],
  statements: [{ text: `
    alter table conversation add column pair_id integer null;
    alter table conversation add constraint uq_conv_pair unique (pair_id);
    alter table message add column client_message_id uuid null;
    alter table message add constraint uq_msg_client unique (conversation_id, sender_id, client_message_id);
    alter table message add constraint ck_msg_text check (kind <> 1 or (body is not null and char_length(btrim(body)) between 1 and 2000 and body !~ '^[[:space:]]*$'));
  ` }],
};
