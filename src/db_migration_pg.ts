import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as s_orig from './lib/schema';
import * as s_new from './lib/schema_updated';
import { Kysely } from 'kysely';
import { exit } from 'process';
type Client = 'CMI' | 'DEV' | 'APP' | 'ALL' | '' | undefined;

// Migration within database; this script might often get updated.
// Set this if you want to migrate only a subset of the data
const clientId: Client = 'ALL';
const oldHostDbName = 'host_db';
const oldUserDbName = 'user_db';
const hostDbName = 'dev_host_db';
const userDbName = 'dev_user_db';
const messageDbName = 'dev_messages_db';
const updateOrCreateNewTables = true;
const dropTablesIfAlreadyPresent = true;
const skipEmptyHostSessions = true;
const skipEmptyUserSessions = true;
const isNewUserDb = true;
const isNewHostDb = true;

// Run this with:
// `npx tsx -r dotenv /config src/db_migration_pg.ts dotenv_config_path=.env.local`

//////////////////////////////////////////////////////
// you shouldn't need to touch anything below this: //
//////////////////////////////////////////////////////

type DBConfig = {
  db: Kysely<any>;
  dbNames: { host: string; user: string; message?: string };
};

// Putting these dbs into a 'container' just to make sure I'm not referencing one of them by accident 😆
const dbContainer = {
  db_orig_local: s_orig.createCustomDbInstance(oldHostDbName, oldUserDbName),
  db_orig_remote: s_orig.createProdDbInstance(),
  db_new_local: s_new.createCustomDbInstance(hostDbName, userDbName, messageDbName),
  db_new_remote: s_new.createProdDbInstanceWithDbNames(),
};

// setupTables(db_new);
// deduplicate(dbContainer.db_orig_remote);
migrate(dbContainer.db_orig_local, dbContainer.db_new_local);
// transferHostTable(dbContainer.db_orig_local, dbContainer.db_new_local);

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
  // Get IDs of entries in the new table (if it exists)
  const existingIds = await db_new.db
    .selectFrom(db_new.dbNames.host)
    .select('id')
    .execute();

  const existingIdSet = new Set(existingIds.map((entry) => entry.id));

  let sessionsToInsert;
  // Select entries from the original table that do not exist in the new table
  if (existingIdSet.size > 0) {
    sessionsToInsert = await db_orig.db
      .selectFrom(db_orig.dbNames.host)
      .selectAll()
      .where('id', 'not in', Array.from(existingIdSet))
      .execute();
  } else {
    sessionsToInsert = await db_orig.db
      .selectFrom(db_orig.dbNames.host)
      .selectAll()
      .execute();
  }

  // Insert the filtered sessions into the new table
  if (sessionsToInsert.length > 0) {
    await db_new.db
      .insertInto(db_new.dbNames.host)
      .values(sessionsToInsert)
      .execute();
  }
}

async function migrate(db_orig: DBConfig, db_new: DBConfig) {
  await setupTables(db_new);

  // Nothing has changed for the host table, but because we might have a new table, we still need to fill it.
  await transferHostTable(db_orig, db_new);

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
  // --> create new user_table
  // --> create new messages_table
  // --> upload data from previous sessions
  // --> drop old tables
  // --> rename temp_ tables

  // Get user sessions

  let userSessions: s_orig.UserSession[];
  if (existsSync('./userSessions.json')) {
    userSessions = JSON.parse(readFileSync('./userSessions.json').toString());
  } else {
    userSessions = (await db_orig.db
      .selectFrom(db_orig.dbNames.user)
      .selectAll()
      .execute()) as s_orig.UserSession[];

    writeFileSync('./userSessions.json', JSON.stringify(userSessions, null, 2));
  }

  let userSessionsAndMessages: {
    newUserSessions?: s_new.NewUserSession;
    messages?: s_new.NewMessage[];
  }[];
  if (existsSync('./userSessionsAndMessages.json')) {
    userSessionsAndMessages = JSON.parse(
      readFileSync('./userSessionsAndMessages.json').toString()
    );
  } else {
    // Transform user sessions to match new schema
    userSessionsAndMessages = userSessions
      .filter((session) => session.chat_text)
      .map(
        (
          session: s_orig.UserSession
        ): {
          newUserSessions?: s_new.NewUserSession;
          messages?: s_new.NewMessage[];
        } => {
          const threadId =
            session.thread_id && session.thread_id.length > 0
              ? session.thread_id
              : `${session.session_id}_${session.id}_${session.user_id}`;

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
            id: session.id,
            session_id: session.session_id,
            user_id: session.user_id,
            summary: session.result_text,
            feedback: session.feedback,
            active: session.active,
            step: session.step,
            start_time: session.start_time,
            last_edit: session.last_edit,
            thread_id: threadId,
            user_name: userName,
          };

          const chatText = session.chat_text as string;
          // Split chat_text into messages based on "Answer:" pattern
          const parts = chatText.split(/(?=Answer\s?:)|(?=Question\s?:)/);
          if (parts.length === 0) {
            return {};
          }
          const invertedRoles =
            parts[0].startsWith('Question') &&
            parts[0].includes(`Don't ask it again.`);
          let creationTimeCounter = 0;
          const messages: s_new.NewMessage[] = parts.map((part) => {
            const role = part.trim().startsWith('Answer')
              ? invertedRoles
                ? 'assistant'
                : 'user'
              : invertedRoles
              ? 'user'
              : 'assistant';
            return {
              thread_id: threadId,
              role,
              content: part.replace(/^(Answer\s?:|Question\s?:)/, '').trim(),
              // For each part, increase the time from the original start time by 5 seconds so that there's a specific order
              created_at: new Date(
                new Date(session.start_time).getTime() +
                  5000 * creationTimeCounter++
              ),
            };
          });

          return {
            newUserSessions,
            messages,
          };
        }
      )
      .filter((data) => data.newUserSessions && data.messages);

    writeFileSync(
      './userSessionsAndMessages.json',
      JSON.stringify(userSessionsAndMessages, null, 2)
    );
  }

  const newUserSessions = userSessionsAndMessages.map(
    (data) => data.newUserSessions
  );
  const messages = userSessionsAndMessages.flatMap((data) => data.messages);

  // Todo: we only need to insert IF it's a new one!
  if (isNewUserDb) {
    db_new.db.insertInto(db_new.dbNames.user).values(newUserSessions).execute();
  }
  if (!db_new.dbNames.message) {
    throw new Error('No message table found!');
  }
  await db_new.db.insertInto(db_new.dbNames.message).values(messages).execute();

  console.log(`Migrated:
- ${newUserSessions.length} user sessions
- ${messages.length} messages`);
}

async function setupTables(dbConfig: DBConfig) {
  if (!updateOrCreateNewTables) return;
  if (dropTablesIfAlreadyPresent) {
    await dbConfig.db.schema
      .dropTable(dbConfig.dbNames.host)
      .cascade()
      .ifExists()
      .execute();
    await dbConfig.db.schema
      .dropTable(dbConfig.dbNames.user)
      .cascade()
      .ifExists()
      .execute();
    if (dbConfig.dbNames.message) {
      await dbConfig.db.schema
        .dropTable(dbConfig.dbNames.message)
        .cascade()
        .ifExists()
        .execute();
    }
  }
  await s_new
    .createHostTable(dbConfig.db, dbConfig.dbNames.host)
    .then(() =>
      s_new.createTriggerOnHostUpdateLastEditSummary(dbConfig.dbNames.host)
    );
  if (isNewUserDb) {
    await s_new
      .createUserTable(dbConfig.db, dbConfig.dbNames.user)
      .then(() =>
        s_new.createTriggerOnUserUpdateLastEditChatText(dbConfig.dbNames.user)
      );
  } else {
    s_new.updateUserTable(dbConfig.db, dbConfig.dbNames.user);
  }
  await s_new.createMessagesTable(
    dbConfig.db,
    dbConfig.dbNames.message!,
    dbConfig.dbNames.user
  );
}
