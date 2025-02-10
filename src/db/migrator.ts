'use server';
import { FileMigrationProvider, Migrator } from 'kysely';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createDbInstance } from '../lib/schema';
import * as dotenv from 'dotenv';

async function migrate() {
  const direction = process.argv[2];

  // Load environment-specific variables
  dotenv.config();
  if (!process.env.POSTGRES_URL) {
    throw new Error(`POSTGRES_URL environment variable is not set in .env`);
  }

  // Damn. At least when running locally on my machine, the .env variables are somehow cached; and not loaded reliably
  console.log(`Using connection `, process.env.POSTGRES_URL);

  await askToProceed();

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
    console.log(`Migrating down`);
    await migrateDown(migrator);
  } else {
    console.log(`Migrating to latest`);
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

async function askToProceed() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const proceed = await new Promise<boolean>((resolve) => {
    readline.question(
      'Do you want to proceed with the migration? (y/n) ',
      (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'y');
      },
    );
  });

  if (!proceed) {
    console.log('Migration cancelled by user');
    process.exit(0);
  }
}

migrate();
