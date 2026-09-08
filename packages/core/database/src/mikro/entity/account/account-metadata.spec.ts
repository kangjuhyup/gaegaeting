import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MIKRO_USER_ENTITIES } from '../../datasource/database-schema.js';

describe('MikroORM USER metadata', () => {
  it('discovers the frozen six-table account schema', async () => {
    expect(MIKRO_USER_ENTITIES).toHaveLength(6);
    const orm = await MikroORM.init({
      driver: PostgreSqlDriver,
      dbName: 'metadata-only',
      entities: [...MIKRO_USER_ENTITIES],
      metadataProvider: ReflectMetadataProvider,
      connect: false,
    });

    try {
      const metadata = [...orm.getMetadata().getAll().values()];
      const tableNames = metadata
        .map(metadata => metadata.tableName)
        .sort();
      expect(tableNames).toEqual([
        'external_user_subject',
        'pet',
        'pet_attachment',
        'user_attachment',
        'user_profile',
        'user_report',
      ]);

      const externalSubject = orm.getMetadata().get('ExternalUserSubjectOrmEntity');
      expect(externalSubject.properties.userId.columnTypes).toEqual(['char(26)']);
      expect(externalSubject.properties.createdAt.columnTypes).toEqual(['timestamptz']);
      expect(externalSubject.properties.updatedAt.columnTypes).toEqual(['timestamptz']);
      expect(externalSubject.uniques).toContainEqual(
        expect.objectContaining({
          name: 'uk_external_user_subject_tenant_sub',
          properties: ['tenantId', 'subject'],
        }),
      );

      const petAttachment = orm.getMetadata().get('PetAttachmentOrmEntity');
      expect(petAttachment.getPrimaryProps().map(property => property.name).sort())
        .toEqual(['no', 'pet']);
      const userAttachment = orm.getMetadata().get('UserAttachmentOrmEntity');
      expect(userAttachment.getPrimaryProps().map(property => property.name).sort())
        .toEqual(['no', 'user']);

      const foreignKeys = metadata
        .flatMap(metadata => Object.values(metadata.properties))
        .filter(property => property.foreignKeyName)
        .map(property => property.foreignKeyName)
        .sort();
      expect(foreignKeys).toEqual([
        'FK_3ce170fc809882ba254be591e9a',
        'FK_447efb21de244c3d43ea8ab26b0',
        'FK_64704296b7bd17e90ca0a620a98',
        'FK_dbee763adbfd464522d0f1bdc9a',
        'FK_e1a59610dd446c038093fc9fa1f',
      ]);
    } finally {
      await orm.close(true);
    }
  });
});
