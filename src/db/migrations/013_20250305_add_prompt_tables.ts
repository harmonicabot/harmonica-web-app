import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // Create prompt_type table
  await db.schema
    .createTable('prompt_type')
    .addColumn('id', 'text', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .execute();

  // Create prompts table
  await db.schema
    .createTable('prompts')
    .addColumn('id', 'text', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('prompt_type', 'text', (col) =>
      col.references('prompt_type.id').onDelete('cascade').notNull(),
    )
    .addColumn('description', 'text')
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
    .execute();

  // Add index for faster lookups by prompt_type
  await db.schema
    .createIndex('prompts_type_idx')
    .on('prompts')
    .column('prompt_type')
    .execute();
}

export async function down(db: Kysely<any>) {
  // Drop in reverse order of dependencies
  await db.schema.dropIndex('prompts_type_idx').execute();
  await db.schema.dropTable('prompts').execute();
  await db.schema.dropTable('prompt_type').execute();
}
