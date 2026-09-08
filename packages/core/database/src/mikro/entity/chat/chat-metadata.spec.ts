import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MIKRO_CHAT_ENTITIES } from '../../datasource/database-schema.js';

describe('MikroORM CHAT metadata', () => {
  it('discovers six tables with the frozen schema contract', async () => {
    expect(MIKRO_CHAT_ENTITIES).toHaveLength(6);
    const orm = await MikroORM.init({
      driver: PostgreSqlDriver,
      dbName: 'metadata-only',
      entities: [...MIKRO_CHAT_ENTITIES],
      metadataProvider: ReflectMetadataProvider,
      connect: false,
    });

    try {
      const metadata = [...orm.getMetadata().getAll().values()];
      expect(metadata.map(item => item.tableName).sort()).toEqual([
        'conversation',
        'message',
        'message_attachment',
        'message_reaction',
        'message_receipt',
        'participant',
      ]);
      expect(metadata.flatMap(item => item.indexes).map(index => index.name).sort())
        .toEqual([
          'ix_attach_msg',
          'ix_conv_last_msg_at',
          'ix_conv_type',
          'ix_msg_conv_id_desc',
          'ix_msg_sender_time',
          'ix_part_user',
        ]);
      expect(metadata.flatMap(item => item.uniques).map(unique => unique.name))
        .toEqual(['uq_conv_direct_key']);

      const message = orm.getMetadata().get('MessageOrmEntity');
      expect(message.properties.conversation.foreignKeyName)
        .toBe('FK_7fe3e887d78498d9c9813375ce2');
      expect(message.properties.conversation.fieldNames).toEqual(['conversation_id']);

      const receipt = orm.getMetadata().get('MessageReceiptOrmEntity');
      expect(receipt.properties.message.columnTypes).toEqual(['int']);
      expect(receipt.getPrimaryProps().map(property => property.name).sort())
        .toEqual(['message', 'userId']);

      const reaction = orm.getMetadata().get('MessageReactionOrmEntity');
      expect(reaction.getPrimaryProps().map(property => property.name).sort())
        .toEqual(['emoji', 'message', 'userId']);

      const foreignKeys = metadata
        .flatMap(item => Object.values(item.properties))
        .filter(property => property.foreignKeyName)
        .map(property => property.foreignKeyName)
        .sort();
      expect(foreignKeys).toEqual([
        'FK_7fe3e887d78498d9c9813375ce2',
        'FK_9b5903f91fdde57571cc40ceafc',
        'FK_9db9a64915214dde2ca1e8db9a7',
        'FK_c3aa2868fc9b2bc57d067642c58',
        'FK_d0a543b03e1ec2f0023ae3f4bb8',
      ]);
    } finally {
      await orm.close(true);
    }
  });
});
