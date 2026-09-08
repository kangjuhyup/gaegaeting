import { createHash } from 'node:crypto';
import type { MigrationClient } from './sql-migration.js';

export function schemaManifestDigest(entries: readonly string[]): string {
  return createHash('sha256').update(entries.join('\n')).digest('hex');
}

interface CatalogRow extends Record<string, unknown> {
  kind: string;
  table_name: string;
  object_name: string;
  definition: string;
}

const CATALOG_SQL = `
select kind, table_name, object_name, definition
from (
  select 'column' as kind,
         c.relname as table_name,
         a.attname as object_name,
         concat(format_type(a.atttypid, a.atttypmod), '|not_null=', a.attnotnull,
                '|default=', coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
                '|generated=', a.attgenerated) as definition
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where n.nspname = 'public' and c.relname = any($1::text[])
     and a.attnum > 0 and not a.attisdropped
  union all
  select 'constraint', c.relname, con.conname, pg_get_constraintdef(con.oid, true)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any($1::text[])
  union all
  select 'index', tab.relname, idx.relname, pg_get_indexdef(i.indexrelid)
    from pg_index i
    join pg_class tab on tab.oid = i.indrelid
    join pg_class idx on idx.oid = i.indexrelid
    join pg_namespace n on n.oid = tab.relnamespace
   where n.nspname = 'public' and tab.relname = any($1::text[])
) catalog
order by kind, table_name, object_name, definition`;

export async function readSchemaManifest(
  client: MigrationClient,
  tables: readonly string[],
): Promise<{ readonly entries: readonly string[] }> {
  const result = await client.query<CatalogRow>(CATALOG_SQL, [[...tables]]);
  return {
    entries: result.rows.map(
      row => `${row.kind}|${row.table_name}|${row.object_name}|${row.definition}`,
    ),
  };
}
