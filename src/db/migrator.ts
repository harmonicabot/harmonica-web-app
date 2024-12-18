import { FileMigrationProvider, Migrator } from 'kysely';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createProdDbInstance } from '../lib/schema_updated';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const { db } = createProdDbInstance();

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, 'migrations'),
  }),
});

migrateToLatest();

async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest();
  
  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    process.exit(1);
  }
} 