import * as s_orig from './lib/schema';
import * as s_new from './lib/schema_updated';
import { createKysely } from '@vercel/postgres-kysely';
import * as dbUtils from '@/lib/db';
import { Kysely, sql } from 'kysely';
import { writeFileSync } from 'fs';
import { exit } from 'process';
type Client = 'CMI' | 'DEV' | 'APP' | 'ALL' | '' | undefined;

// Migration within database; this script might often get updated.
// Set this if you want to migrate only a subset of the data
const clientId: Client = 'DEV';
const hostDbName = 'host_temp_trial'; // For the 'real' migration, replace this with 'host_data'
const userDbName = 'user_temp_trial'; // For the 'real' migration, replace this with 'user_data'
const messageDbName = 'messages_temp_trial'; // For the 'real' migration, replace this
const updateOrCreateNewTables = true;
const dropTablesIfAlreadyPresent = false;
const skipEmptyHostSessions = true;
const skipEmptyUserSessions = true;

// Run this with:
// `npx tsx -r dotenv /config src/db_migration_pg.ts dotenv_config_path=.env.local`

//////////////////////////////////////////////////////
// you shouldn't need to touch anything below this: //
//////////////////////////////////////////////////////

// Shortcut: Create dump of the current database, then read it from the file here.
// That way it's a bit nicer to experiment with the migration script.
// Optimally we'd also do that with a local database first, let's see.

// Import from local dump:
import { readFileSync } from 'fs';

type DBConfig = {
  db: Kysely<any>;
  dbNames: { host: string; user: string };
};
const db_orig = s_orig.createCustomDbInstance('host_db', 'user_db');
const db_remote = s_orig.createProdDbInstance();
const db_new = s_new.createCustomDbInstance(
  hostDbName,
  userDbName,
  messageDbName
);

// setupTables(db_new);
async function setupTables(db: Kysely<any>) {
  if (!updateOrCreateNewTables) return;
  if (dropTablesIfAlreadyPresent) {
    await db.schema.dropTable(hostDbName).ifExists().execute();
    await db.schema.dropTable(userDbName).ifExists().execute();
    await db.schema.dropTable(messageDbName).ifExists().execute();
  }
  await s_new
    .createHostTable(db, hostDbName)
    .then(() => s_new.createTriggerOnHostUpdateLastEditSummary(hostDbName));
  await s_new
    .createUserTable(db, userDbName)
    .then(() => s_new.createTriggerOnUserUpdateLastEditChatText(userDbName));
  await s_new.createMessagesTable(db, messageDbName, userDbName);
}

deduplicate(db_remote);
async function deduplicate(dbConfig: DBConfig) {
  const { db, dbNames } = dbConfig;
  // const hostSessions = await db.selectFrom(dbNames.host).selectAll().execute();

  // Get all user sessions
  const userSessions = await db.selectFrom(dbNames.user).selectAll().execute();

  // console.log('HostSessions: ', hostSessions);
  // console.log('UserSessions: ', userSessions);

  const getSessionString = (session: s_orig.UserSession): string => {
    const { id, start_time, last_edit, ...rest } = session;
    return JSON.stringify(rest);
  };

  const sessionMap = new Map<string, s_orig.UserSession>();

  let count = 0;
  const uniqueUserSessions = userSessions.filter((sessionX) => {
    const session = sessionX as s_orig.UserSession;
    const hash = getSessionString(session);

    if (sessionMap.has(hash)) {
      count++;
      // console.log('Duplicate entry, ommitting: ', session);
      return false;
    }
    // Also filter out those that don't have any chat text or no answer.
    const searchPattern = /Answer\s?:/;
    if (
      !session.chat_text ||
      session.chat_text.length === 0 ||
      !searchPattern.test(session.chat_text)
    ) {
      console.log("Exclude entry with chat: \n", session.chat_text);
      return false;
    }
    sessionMap.set(hash, session);
    return true;
  });
  console.log(
    `Ommitted ${count} duplicates out of ${userSessions.length} total sessions. Remaining: ${uniqueUserSessions.length}`
  );

  // First delete all existing entries
  await db.deleteFrom(dbNames.user).execute();

  // Then insert the unique sessions
  await db.insertInto(dbNames.user).values(uniqueUserSessions).execute();

  exit(0);
}

// export async function upsertHostSession(
//   data: s_new.NewHostSession,
//   onConflict: 'skip' | 'update' = 'skip'
// ): Promise<void> {
//   try {
//     await db_new
//       .insertInto(hostDbName)
//       .values(data)
//       .onConflict((oc) =>
//         onConflict === 'skip'
//           ? oc.column('id').doNothing()
//           : oc.column('id').doUpdateSet(data)
//       )
//       .execute();
//   } catch (error) {
//     console.error('Error upserting host session:', error);
//     console.log('HostSession: ', data);
//     throw error;
//   }
// }

// export async function upsertUserSessions(
//   data: s_orig.NewUserSession[],
//   onConflict: 'skip' | 'update' = 'skip'
// ): Promise<void> {
//   await dbUtils
//     .insertInto(userDbName)
//     .values(data)
//     .onConflict((oc) =>
//       onConflict === 'skip'
//         ? oc.column('id').doNothing()
//         : oc.column('id').doUpdateSet((eb) => ({
//             active: eb.ref('excluded.active'),
//             chat_text: eb.ref('excluded.chat_text'),
//             feedback: eb.ref('excluded.feedback'),
//             last_edit: eb.ref('excluded.last_edit'),
//           }))
//     )
//     .execute();
// }

// export async function insertUserSessions(
//   data: s_orig.NewUserSession | s_orig.NewUserSession[]
// ): Promise<string[]> {
//   try {
//     const result = await dbUtils
//       .insertInto(userDbName)
//       .values(data)
//       .returningAll()
//       .execute();
//     return result.map((row) => row.id);
//   } catch (error) {
//     console.error('Error inserting user sessions:', error);
//     console.log('UserSessions: ', data);
//     throw error;
//   }
// }

// export async function insertMessages(data: s_orig.NewMessage | s_orig.NewMessage[]) {
//   try {
//     console.log('Inserting message with data:', data);
//     const result = await dbUtils.insertInto(messageDbName).values(data).execute();
//   } catch (error) {
//     console.error('Error inserting message:', error);
//     throw error;
//   }
// }
