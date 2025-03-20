import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create invitations table
  await db.schema
    .createTable('invitations')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('email', 'varchar', (col) => col.notNull())
    .addColumn('resource_id', 'varchar', (col) => col.notNull())
    .addColumn('resource_type', 'varchar', (col) => col.notNull())
    .addColumn('role', 'varchar', (col) => col.notNull())
    .addColumn('message', 'text')
    .addColumn('created_by', 'varchar')
    .addColumn('accepted', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamp', (col) => 
      col.notNull().defaultTo(sql`current_timestamp`)
    )
    .execute();

  // Add index on email for faster searches
  await db.schema
    .createIndex('invitations_email_idx')
    .on('invitations')
    .column('email')
    .execute();
    
  // Add index on resource_id for faster searches
  await db.schema
    .createIndex('invitations_resource_idx')
    .on('invitations')
    .columns(['resource_id', 'resource_type'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('invitations').execute();
}