'use server';
import { FileMigrationProvider, Migrator } from 'kysely';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createDbInstance } from '../lib/schema';
import * as dotenv from 'dotenv';

async function migrate() {
  const environmentSuffix = process.argv[2] || '.local';
  const direction = process.argv[3];

  console.log(`Performing migration with .env${environmentSuffix}`)

  if (!['.local', '.development.local', '.production.local'].includes(environmentSuffix)) {
    console.error('Invalid environment. Please use the suffix for a valid .env file: .local, .development.local, or .production.local');
    process.exit(1);
  }

  // Load environment-specific variables
  const envPath = path.resolve(process.cwd(), `./.env${environmentSuffix}`)
  console.log(`Using ${envPath} to load env vars...`)  
  dotenv.config({ path: envPath});
  if (!process.env.POSTGRES_URL) {
    throw new Error(`POSTGRES_URL environment variable is not set in .env${environmentSuffix}`);
  }

  // Damn. At least when running locally on my machine, the .env variables are somehow cached; and not loaded reliably
  console.log(`Using connection `, process.env.POSTGRES_URL)

  const db = await createDbInstance();

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  if (direction === 'down') {
    console.log(`Migrating down for ${environmentSuffix} environment...`);
    await migrateDown(migrator);
  } else {
    console.log(`Migrating to latest for ${environmentSuffix} environment... `);
    await migrateToLatest(migrator);
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