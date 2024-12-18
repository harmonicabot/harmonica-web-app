'use server';
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

async function migrate() {
  const { db } = await createProdDbInstance();

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const direction = process.argv[2];

  if (direction === 'down') {
    console.log('Migrating down...');
    migrateDown(migrator);
  } else {
    console.log('Migrating to latest...');
    migrateToLatest(migrator);
  }
  console.log('Migration script finished!');
}

async function migrateToLatest(migrator: Migrator) {
  const { error, results } = await migrator.migrateToLatest();
  handleResults(error, results);
}

async function migrateDown(migrator: Migrator) {
  const { error, results } = await migrator.migrateDown();
  handleResults(error, results);
}

function handleResults(error: any, results: any) {
  results?.forEach((it: any) => {
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

migrate();