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
// const hostDbName = 'host_temp_trial'; // For the 'real' migration, replace this with 'host_data'
// const userDbName = 'user_temp_trial'; // For the 'real' migration, replace this with 'user_data'
// const messageDbName = 'messages_temp_trial'; // For the 'real' migration, replace this
const updateOrCreateNewTables = true;
const dropTablesIfAlreadyPresent = true;
const skipEmptyHostSessions = true;
const skipEmptyUserSessions = true;

// Run this with:
// `npx tsx -r dotenv /config src/db_migration_pg.ts dotenv_config_path=.env.local`

//////////////////////////////////////////////////////
// you shouldn't need to touch anything below this: //
//////////////////////////////////////////////////////

type DBConfig = {
  db: Kysely<any>;
  dbNames: { host: string; user: string, message?: string };
};

// Puttind these dbs into a 'container' just to make sure I'm not referencing one of them by accident 😆
const dbContainer = {
  db_orig_local: s_orig.createCustomDbInstance('host_db', 'user_db'),
  db_orig_remote: s_orig.createProdDbInstance(),
  db_new_local: s_new.createCustomDbInstance(
    'host_temp_trial',
    'user_temp_trial',
    'messages_temp_trial'
  ),
}

// setupTables(db_new);
// deduplicate(dbContainer.db_orig_remote);
// migrate(dbContainer.db_orig_local, dbContainer.db_new_local);
// transferHostTable(dbContainer.db_orig_local, dbContainer.db_new_local);


async function setupTables(dbConfig: DBConfig) {
  if (!updateOrCreateNewTables) return;
  if (dropTablesIfAlreadyPresent) {
    await dbConfig.db.schema.dropTable(dbConfig.dbNames.host).cascade().ifExists().execute();
    await dbConfig.db.schema.dropTable(dbConfig.dbNames.user).cascade().ifExists().execute();
    if (dbConfig.dbNames.message) {
      await dbConfig.db.schema.dropTable(dbConfig.dbNames.message).cascade().ifExists().execute();
    }
  }
  await s_new
    .createHostTable(dbConfig.db, dbConfig.dbNames.host)
    .then(() => s_new.createTriggerOnHostUpdateLastEditSummary(dbConfig.dbNames.host));
  await s_new
    .createUserTable(dbConfig.db, dbConfig.dbNames.user)
    .then(() => s_new.createTriggerOnUserUpdateLastEditChatText(dbConfig.dbNames.user));
  await s_new.createMessagesTable(dbConfig.db, dbConfig.dbNames.message, dbConfig.dbNames.user);
}

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
      console.log('Exclude entry with chat: \n', session.chat_text);
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

async function transferHostTable(db_orig: DBConfig, db_new: DBConfig) {
  const hostSessions = await db_orig.db.selectFrom(db_orig.dbNames.host).selectAll().execute();
  await db_new.db.insertInto(db_new.dbNames.host).values(hostSessions).execute();
}

async function migrate(db_orig: DBConfig, db_new: DBConfig) {
  // Nothing has changed for the host table, but because we have a new table, we need to create it.
  transferHostTable(db_orig, db_new);

  // User:

  // This was renamed:
  // result_text?: string;  -->  summary?: string;

  // These were removed:
  // template: string;
  // bot_id?: string;
  // host_chat_id?: string;
  // chat_text?: string;

  // This table was added:
  // interface MessagesTable {
  // id: Generated<string>;
  // thread_id: string;
  // role: 'user' | 'assistant';
  // content: string;
  // created_at: Generated<Date>;
  // }

  // Migration steps:
  // --> create new temp_user_table
  // --> create new & messages_table
  // --> upload data from previous sessions
  // --> drop old tables
  // --> rename temp_ tables

  // Get user sessions
  const userSessions = (await db_orig.db
    .selectFrom(db_orig.dbNames.user)
    .selectAll()
    .execute()) as s_orig.UserSession[];

  // Transform user sessions to match new schema
  const userSessionsAndMessages = userSessions.map(
    (
      session: s_orig.UserSession
    ): {
      newUserSessions?: s_new.NewUserSession;
      messages?: s_new.NewMessage[];
    } => {
      const threadId =
        session.thread_id && session.thread_id.length > 0 ? session.thread_id :
        `${session.session_id}_${session.id}_${session.user_id}`;

      if (threadId.length == 0) {
        console.log('Empty thread for session: ', session);
        return {};
      }
      
      function extractName(input: string): string {
        const prefix = ' : User name is ';
        const startIndex = input.indexOf(prefix);
        if (startIndex === -1) return 'anonymous';

        let nameStart = startIndex + prefix.length;
        if (
          input.substring(nameStart).toLowerCase().startsWith('my name is ')
        ) {
          nameStart += 'my name is '.length;
        }
        let nameEnd = input.length;

        for (let i = nameStart; i < input.length; i++) {
          if (input[i] === '.' || input.slice(i, i + 6) === 'Answer') {
            nameEnd = i;
            break;
          }
        }

        const name = input.slice(nameStart, nameEnd).trim();
        return name || 'anonymous';
      }

      const userName = session.chat_text
        ? extractName(session.chat_text)
        : 'anonymous';

      const newUserSessions = {
        ...session,
        thread_id: threadId,
        user_name: userName,
      };

      const chatText = session.chat_text as string;
      // Split chat_text into messages based on "Answer:" pattern
      const parts = chatText.split(/(?=Answer\s?:)|(?=Question\s?:)/);

      let creationTimeCounter = 0;
      const messages: s_new.NewMessage[] = parts.map((part) => ({
        thread_id: threadId,
        role: part.trim().startsWith('Answer') ? 'assistant' : 'user',
        content: part.replace(/^(Answer\s?:|Question\s?:)/, '').trim(),
        // For each part, increase the time from the original start time by 5 seconds so that there's a specific order
        created_at: new Date(
          session.start_time.getTime() + 5000 * creationTimeCounter++
        ),
      }));

      return {
        newUserSessions,
        messages,
      };
    }
  ).filter((data) => data.newUserSessions && data.messages);

  const newUserSessions = userSessionsAndMessages.map((data) => data.newUserSessions);
  const messages = userSessionsAndMessages.flatMap((data) => data.messages);

  // Create tables if they don't exist:
  await setupTables(db_new);

  await db_new.db.insertInto(db_new.dbNames.user).values(newUserSessions).execute();
  if (!db_new.dbNames.message) {
    throw new Error('No message table found!');
  }
  await db_new.db.insertInto(db_new.dbNames.message).values(messages).execute();

  console.log(`Migrated:
- ${newUserSessions.length} user sessions
- ${messages.length} messages`);
}