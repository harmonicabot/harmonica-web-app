import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add timestamp columns to prompt_type table
  await db.schema
    .alterTable('prompt_type')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  // Add timestamp columns to prompts table
  await db.schema
    .alterTable('prompts')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  // Create trigger function to update updated_at automatically
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `.execute(db);

  // Create triggers for both tables
  await sql`
    CREATE TRIGGER update_prompt_type_updated_at
      BEFORE UPDATE ON prompt_type
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `.execute(db);

  await sql`
    CREATE TRIGGER update_prompts_updated_at
      BEFORE UPDATE ON prompts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop triggers first
  await sql`DROP TRIGGER IF EXISTS update_prompt_type_updated_at ON prompt_type`.execute(
    db,
  );
  await sql`DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts`.execute(
    db,
  );

  // Drop trigger function
  await sql`DROP FUNCTION IF EXISTS update_updated_at_column`.execute(db);

  // Remove timestamp columns from prompt_type
  await db.schema
    .alterTable('prompt_type')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute();

  // Remove timestamp columns from prompts
  await db.schema
    .alterTable('prompts')
    .dropColumn('created_at')
    .dropColumn('updated_at')
    .execute();
}
