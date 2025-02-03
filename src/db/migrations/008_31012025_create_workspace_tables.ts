import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
  // Create role enum type for permission management
  await sql`CREATE TYPE access_role AS ENUM ('admin', 'owner', 'editor', 'viewer', 'none')`.execute(db);

  // Main workspaces table - handles workspace hierarchy
  await db.schema
    .createTable('workspaces')
    .addColumn('id', 'text', (col) =>  col.primaryKey().defaultTo(sql`'wsp_' || substr(md5(random()::text), 1, 12)`))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('parent_id', 'text', (col) => 
      col.references('workspaces.id').onDelete('cascade')
    )
    .addColumn('created_at', 'timestamp', (col) => 
      col.defaultTo('now()').notNull()
    )
    .addColumn('last_modified', 'timestamp', (col) => 
      col.defaultTo('now()').notNull()
    )
    .execute();

  // Junction table linking workspaces to their sessions
  // Minimal structure as session data lives in host_db
  await db.schema
    .createTable('workspace_sessions')
    .addColumn('workspace_id', 'text', (col) => 
      col.references('workspaces.id').onDelete('cascade').notNull()
    )
    .addColumn('session_id', 'text', (col) => 
      col.references('host_db.id').onDelete('cascade').notNull()
    )
    // Primary key on both columns ensures no duplicate entries
    .addPrimaryKeyConstraint('workspace_sessions_pkey', ['workspace_id', 'session_id'])
    .execute();

  // Unified permissions table for both workspaces and sessions
  await db.schema
    .createTable('permissions')
    .addColumn('resource_id', 'text', (col) => col.notNull())
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('role', sql`access_role`, (col) => 
      col.notNull().defaultTo('viewer')
    )
    // Primary key prevents duplicate permissions per user/resource
    .addPrimaryKeyConstraint('permissions_pkey', ['resource_id', 'user_id'])
    .execute();


  // Create indexes for common query patterns
  await db.schema
    .createIndex('permissions_user_idx')
    .on('permissions')
    .columns(['user_id', 'role'])
    .execute();

  await db.schema
    .createIndex('permissions_resource_idx')
    .on('permissions')
    .column('resource_id')
    .execute();
}

export async function down(db: Kysely<any>) {
  // Drop in reverse order of dependencies
  await db.schema.dropIndex('permissions_resource_idx').execute();
  await db.schema.dropIndex('permissions_user_idx').execute();
  await db.schema.dropTable('permissions').execute();
  await db.schema.dropTable('workspace_sessions').execute();
  await db.schema.dropTable('workspaces').execute();
  await db.schema.dropType('access_role').execute();
}
