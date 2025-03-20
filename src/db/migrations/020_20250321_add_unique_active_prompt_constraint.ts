import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // First, deactivate duplicate active prompts if any exist
  await sql`
    WITH ranked_prompts AS (
      SELECT 
        id,
        prompt_type,
        active,
        ROW_NUMBER() OVER (PARTITION BY prompt_type ORDER BY created_at DESC) as rn
      FROM prompts
      WHERE active = true
    )
    UPDATE prompts
    SET active = false
    WHERE id IN (
      SELECT id 
      FROM ranked_prompts 
      WHERE rn > 1
    )
  `.execute(db);

  // Create a partial unique index that enforces our business rule
  await sql`
    CREATE UNIQUE INDEX unique_active_prompt_per_type 
    ON prompts (prompt_type) 
    WHERE active = true
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS unique_active_prompt_per_type
  `.execute(db);
}
