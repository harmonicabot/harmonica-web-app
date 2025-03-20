import { Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  // Add resource_type column
  await db.schema
    .alterTable('permissions')
    .addColumn('resource_type', 'text', (col) => 
      col.notNull().defaultTo('SESSION')
    )
    .execute();
    
  // Drop existing primary key constraint
  await db.schema
    .alterTable('permissions')
    .dropConstraint('permissions_pkey')
    .execute();
    
  // Add new primary key that includes resource_type
  await db.schema
    .alterTable('permissions')
    .addPrimaryKeyConstraint('permissions_pkey', ['resource_id', 'user_id', 'resource_type'])
    .execute();
}

export async function down(db: Kysely<any>) {
  // Drop the new primary key constraint
  await db.schema
    .alterTable('permissions')
    .dropConstraint('permissions_pkey')
    .execute();
    
  // Restore the original primary key constraint
  await db.schema
    .alterTable('permissions')
    .addPrimaryKeyConstraint('permissions_pkey', ['resource_id', 'user_id'])
    .execute();
    
  // Drop the resource_type column
  await db.schema
    .alterTable('permissions')
    .dropColumn('resource_type')
    .execute();
}
