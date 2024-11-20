import { Kysely } from 'kysely';
import * as s from './lib/schema';
import { writeFileSync, readFileSync, existsSync } from 'fs';

import { createKysely } from '@vercel/postgres-kysely';
import { upsertUserSession } from './lib/db';
import { exit } from 'process';
import * as readline from 'readline';

type Client = 'CMI' | 'DEV' | 'APP' | 'ALL' | '' | undefined;

// Set this if you want to migrate only a subset of the data
const clientId: Client = 'ALL';
const hostDbName = 'host_local';
const userDbName = 'user_local';
const updateOrCreateNewTables = true;
const dropTablesIfAlreadyPresent = false;
const skipEmptyHostSessions = true;
const skipEmptyUserSessions = true;

// Run this with:
// `npx tsx -r dotenv /config src/db_migration.ts dotenv_config_path=.env.local`

//////////////////////////////////////////////////////
// you shouldn't need to touch anything below this: //
//////////////////////////////////////////////////////
// interface Databases {
//   [hostDbName]: s.HostSessionsTable;
//   [userDbName]: s.UserSessionsTable;
// }

// const db = createKysely<Databases>();

type MigrationDatabases = {
  host_local: s.HostSessionsTable;
  user_local: s.UserSessionsTable;
};

type DBConfig = {
  db: Kysely<MigrationDatabases>;
  dbNames: { host: string; user: string; message?: string };
};

const dbConfig = s.createCustomDbInstance<MigrationDatabases>(
  'host_local',
  'user_local'
);
const db = dbConfig.db;
const tableNames = dbConfig.dbNames;

// #### Legacy make.com db stuff ####
type UserSessionData = {
  session_id?: string;
  active: boolean;
  user_id?: string;
  template?: string;
  feedback?: string;
  chat_text?: string;
  thread_id?: string;
  result_text?: string;
  topic?: string;
  context?: string;
  bot_id?: string;
  host_chat_id?: string;
};

type RawSessionOverview = {
  id?: string;
  active?: number | boolean;
  topic: string;
  context: string;
  summary: string;
  template?: string;
  start_time?: Date | string;
  botId?: string;
  client?: string;
  final_report_sent?: boolean;
};

type HostAndAssociatedUsers = {
  host: s.NewHostSession;
  users: s.NewUserSession[];
};

type AssociatedSessions = Record<string, HostAndAssociatedUsers>;

const sessionStore = 17957;
const userStore = 17913;

let limit = 100;
const token = process.env.MAKE_AUTH_TOKEN;

type DbRecord = {
  key: string;
  data: UserSessionData | RawSessionOverview;
};

// setUserNames();
// testOperations();

// migrateFromMake().then(() => {
//   console.log('Migration complete.');
// });
// deduplicate(dbConfig);
deduplicateByComparingPgWithMake(dbConfig);

async function setupTables(dbConfig: DBConfig) {
  if (!updateOrCreateNewTables) return;
  if (dropTablesIfAlreadyPresent) {
    await db.schema.dropTable(tableNames.host).ifExists().execute();
    await db.schema.dropTable(tableNames.user).ifExists().execute();
  }
  await s
    .createHostTable(db, tableNames.host)
    .then(() => s.createTriggerOnHostUpdateLastEditSummary(tableNames.host));
  await s
    .createUserTable(db, tableNames.user)
    .then(() => s.createTriggerOnUserUpdateLastEditChatText(tableNames.user));
}

async function deduplicateByComparingPgWithMake(dbConfig: DBConfig) {
  const { db, dbNames } = dbConfig;

  // Combine the make sessions with the ones that we already have in the database, then deduplicate them

  let userSessionsFromMake: s.NewUserSession[] = [];
  let hostSessionsFromMake: s.NewHostSession[] = [];
  if (
    existsSync('./userSessionsFromMake.json') &&
    existsSync('./hostSessionsFromMake.json')
  ) {
    userSessionsFromMake = JSON.parse(
      readFileSync('./userSessionsFromMake.json').toString()
    );
    hostSessionsFromMake = JSON.parse(
      readFileSync('./hostSessionsFromMake.json').toString()
    );

  } else {
    const sessionsFromMake = await getSessionsFromMake();
    if (sessionsFromMake === null) {
      console.log('No sessions found in Make');
      return { host: [], user: [] };
    }
    const asSessionData = transformMakeToPostgres(sessionsFromMake);
    userSessionsFromMake = asSessionData.userSessions;
    hostSessionsFromMake = asSessionData.hostSessions;
    userSessionsFromMake.sort((a, b) => a.session_id.localeCompare(b.session_id));
    
    writeFileSync(
      './userSessionsFromMake.json',
      JSON.stringify(userSessionsFromMake, null, 2)
    );

    writeFileSync(
      './hostSessionsFromMake.json',
      JSON.stringify(hostSessionsFromMake, null, 2)
    );
  }

  const userSessions = (await db
    .selectFrom(userDbName)
    .selectAll()
    .execute()) as s.NewUserSession[];

  const hostSessions = (await db
    .selectFrom(hostDbName)
    .selectAll()
    .execute()) as s.NewHostSession[];

    writeFileSync(
      './userSessionsFromPG.json',
      JSON.stringify(userSessions, null, 2)
    );

    writeFileSync(
      './hostSessionsFromPG.json',
      JSON.stringify(hostSessions, null, 2)
    );

  // Identify new & updated HOST entries from makeDB:
  const hostMap = createHostMap(hostSessions);
  const newHostEntriesFromMake = new Map<string, s.NewHostSession>();
  const updatedHostEntriesFromMake = new Map<string, s.NewHostSession>();
  hostSessionsFromMake.forEach((makeSession) => {
    const hostSession = hostMap.get(makeSession.id!);
    if (!hostSession) {
      console.log('New Host session found in make: ', makeSession);
      hostMap.set(makeSession.id!, makeSession);
      newHostEntriesFromMake.set(makeSession.id!, makeSession);
      return;
    } else {
      // Duplicate found. let's keep the ... one with earlier start_time and later last_edit; the start_time might have been set to something later during an earlier migration.
      // (NOT just the one from make, because we have a split db, it might have been modified either in app or cmi...)
      console.log('Duplication of hosot sessions: ', hostSession, makeSession);

      const makeSessionStartTime = new Date(makeSession.start_time || 0);
      const hostSessionStartTime = new Date(hostSession.start_time || 0);

      const makeSessionLastEdit = new Date(makeSession.last_edit || 0);
      const hostSessionLastEdit = new Date(hostSession.last_edit || 0);

      if (
        makeSessionLastEdit > hostSessionLastEdit ||
        (makeSessionLastEdit === hostSessionLastEdit &&
          makeSessionStartTime < hostSessionStartTime)
      ) {
        hostMap.set(makeSession.id!, makeSession);
        updatedHostEntriesFromMake.set(makeSession.id!, makeSession);
      }
    }
  });

  // Get new & updated USER entries from makeDB:
  const userSessionsMap = await dedupeUserSessions(userSessions);
  const newUserEntriesFromMake = new Map<string, s.NewUserSession>();
  const updatedUserEntriesFromMake = new Map<string, s.NewUserSession>();
  await dedupeUserSessions(
    userSessionsFromMake,
    userSessionsMap,
    newUserEntriesFromMake,
    updatedUserEntriesFromMake
  );

  const newHostSessionsSorted = Array.from(newHostEntriesFromMake.values()).sort(sortByLastEdit);
  console.log("Adding new host sessions: ", newHostSessionsSorted);

  const updatedHostSessionsSorted = Array.from(updatedHostEntriesFromMake.values()).sort(sortByLastEdit);   
  console.log("Updating host sessions: ");
  Object.entries(updatedHostEntriesFromMake).forEach(([id, session]) => {
    console.log(hostMap.get(id), "\n => \n", session);
  });


  const newUserSessionsSorted = Array.from(newUserEntriesFromMake.values()).sort((a, b) => a.session_id.localeCompare(b.session_id));
  const updatedUserSessionsSorted = Array.from(updatedUserEntriesFromMake.values()).sort((a, b) => a.session_id.localeCompare(b.session_id)); 
  console.log("Adding new user sessions: ", newUserSessionsSorted);
  console.log("Updating user sessions: ");
  Object.entries(updatedUserEntriesFromMake).forEach(([id, session]) => {
    console.log(userSessionsMap.get(id), "\n => \n", session);
  });
}

function getHostSessionHash(
  session: s.UserSession | s.NewUserSession
): string {
  const chatText = session.chat_text ?? '';
  return chatText.slice(0, Math.min(800, chatText.length));
}

async function dedupeUserSessions(
  userSessions: s.NewUserSession[],
  baseMap: Map<string, s.NewUserSession> = new Map<string, s.NewUserSession>(),
  newEntriesMap?: Map<string, s.NewUserSession>,
  updatedEntriesMap?: Map<string, s.NewUserSession>
) {
  // If no newEntriesMap is provided we assume all entries should just be put in the baseMap, should be the case for first instantiation
  for (const session of userSessions) {
    // Don't add those that don't have any chat text or no answer.
    const searchPattern = /Answer\s?:/;
    if (
      !session.chat_text ||
      session.chat_text.length === 0 ||
      !searchPattern.test(session.chat_text)
    ) {
      continue;
    }
    const hash = getHostSessionHash(session);

    if (baseMap.has(hash)) {
      // Chat text is the same! Let's compare other things:
      const existingSession = baseMap.get(hash)!;

      if (
        existingSession.thread_id != null &&
        session.thread_id != null &&
        existingSession.thread_id != session.thread_id
      ) {
        // These _are_ distinct entries
        if (newEntriesMap) {
          newEntriesMap.set(hash, session);
        } else {
          baseMap.set(hash, session);
        }
        continue;
      }

      if (existingSession.chat_text?.length === session.chat_text?.length) {
        // Take the entry that has the earlier start date; a lot of new entries might have updated it to the time of the last migration...
        // And usually these two entries have all the same info anyway.
        if (
          existingSession.start_time &&
          session.start_time &&
          new Date(existingSession.start_time) > new Date(session.start_time)
        ) {
          if (updatedEntriesMap) {
            updatedEntriesMap.set(hash, session);
          } else {
            baseMap.set(hash, session);
          }
        }
        continue;
      }

      const choice = await askUser(existingSession, session);
      if (choice === 2) {
        if (updatedEntriesMap) {
          updatedEntriesMap.set(hash, session);
        } else {
          baseMap.set(hash, session);
        }
      } else if (choice === 3) {
        if (newEntriesMap) {
          newEntriesMap.set(hash, session);
        } else {
          baseMap.set(hash, session);
        }
      } else if (choice === 4) {
        baseMap.delete(hash);
      }
      continue;
    }

    if (newEntriesMap) {
      newEntriesMap.set(hash, session);
    } else {
      baseMap.set(hash, session);
    }
  }
  return baseMap;
}

function sortByLastEdit(a: s.NewHostSession, b: s.NewHostSession): number {
  if (!a.last_edit || !b.last_edit) {
    if (!a.last_edit && !b.last_edit) {
      return 0;
    }
    if (!a.last_edit) {
      return 1;
    }
    return -1;
  }
  // Because sometimes we get this from a file, the date might be in string from, so we need to create a proper date for it.
  return new Date(b.last_edit).getTime() - new Date(a.last_edit).getTime();
}

function createHostMap(hostSessions: s.NewHostSession[]) {
  const hostMap = new Map<string, s.NewHostSession>();
  hostSessions.sort(sortByLastEdit);

  hostSessions.forEach((hostSession) => {
    // I believe all ids should be set...
    if (!hostSession.id) {
      throw new Error('Host session id is not set');
    }
    if (hostMap.has(hostSession.id)) {
      console.warn(
        `Duplicate host session: New vs Old:`,
        hostMap.get(hostSession.id),
        hostSession
      );
      return; // Duplicate entry, skip it. (The first one is the newer one, because they're sorted by last_edit)
    }
    hostMap.set(hostSession.id, hostSession);
  });
  return hostMap;
}

async function deduplicate(dbConfig: DBConfig) {
  const { db, dbNames } = dbConfig;

  const userSessions: s.NewUserSession[] = [];
  const hostSessions: s.NewHostSession[] = [];

  if (
    existsSync('./allUserSessions.json') &&
    existsSync('./allHostSessions.json')
  ) {
    console.log('Loading sessions from file...');
    userSessions.push(
      ...(JSON.parse(
        readFileSync('./allUserSessions.json', 'utf8')
      ) as s.NewUserSession[])
    );

    hostSessions.push(
      ...(JSON.parse(
        readFileSync('./allHostSessions.json', 'utf8')
      ) as s.NewHostSession[])
    );
  } else {
    const { host, user } = await getAllSessionsCombined();
    hostSessions.push(...host);
    userSessions.push(...user);

    writeFileSync(
      'allHostSessions.json',
      JSON.stringify(hostSessions, null, 2)
    );
    writeFileSync(
      'allUserSessions.json',
      JSON.stringify(userSessions, null, 2)
    );
  }

  const uniqueUserSessions = await getUniqueUserSessions(userSessions);
  const uniqueHostSessions = getUniqueHostSessions(hostSessions);

  writeFileSync(
    'uniqueHostSessions.json',
    JSON.stringify(uniqueHostSessions, null, 2)
  );

  writeFileSync(
    'uniqueUserSessions.json',
    JSON.stringify(uniqueUserSessions, null, 2)
  );

  // First delete all existing entries, then insert the new ones.
  await db.deleteFrom(hostDbName).execute();
  await db.insertInto(hostDbName).values(uniqueHostSessions).execute();
  await db.deleteFrom(userDbName).execute();
  await db.insertInto(userDbName).values(uniqueUserSessions).execute();
}

async function askUser(
  session1: s.NewUserSession,
  session2: s.NewUserSession
): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const { chat_text: text1, ...session1WithoutText } = session1;
  const { chat_text: text2, ...session2WithoutText } = session2;
  console.log(
    `\n=== SESSION 1 ===\n`,
    session1WithoutText,
    `\n=== SESSION 2 ===\n`,
    session2WithoutText
  );

  const length1 = text1?.length || 0;
  const length2 = text2?.length || 0;
  console.log('\n=== TEXT 1 ===');
  console.log(
    text1?.slice(0, 200) + '[...]\n[...]' + text1?.slice(length1 - 200)
  );
  console.log('\n=== TEXT 2 ===');
  console.log(
    text2?.slice(0, 200) + '[...]\n[...]' + text2?.slice(length2 - 200)
  );

  // Show key differences
  console.log(
    '\nLength difference:',
    `Text 1: ${text1?.length || 0} chars, `,
    `Text 2: ${text2?.length || 0} chars`
  );

  return new Promise((resolve) => {
    rl.question(
      `\nWhich one to keep ? (1 or 2; or 3(both) or 4 (neither)): `,
      (answer) => {
        rl.close();
        resolve(Number(answer));
      }
    );
  });
}

async function getUniqueUserSessions(userSessions: s.NewUserSession[]) {
  const getSessionHash = (
    session: s.UserSession | s.NewUserSession
  ): string => {
    if (session.thread_id) {
      const { session_id, template, thread_id } = session;
      return JSON.stringify({ session_id, template, thread_id });
    } else {
      const { session_id, template, chat_text } = session;
      return JSON.stringify({
        session_id,
        template,
        chat_text: chat_text?.slice(0, Math.max(400, chat_text.length)),
      });
    }
  };

  const uniqueUserSessionsMap = new Map<string, s.NewUserSession>();
  let count = 0;

  for (const session of userSessions) {
    const hash = getSessionHash(session);

    if (uniqueUserSessionsMap.has(hash)) {
      count++;
      const existingSession = uniqueUserSessionsMap.get(hash)!;
      if (existingSession.chat_text?.length === session.chat_text?.length) {
        // Take the entry that has the earlier start date; a lot of new entries might have updated it to the time of the last migration...
        // And usually these two entries have all the same info anyway.
        if (
          existingSession.start_time &&
          session.start_time &&
          new Date(existingSession.start_time) > new Date(session.start_time)
        ) {
          uniqueUserSessionsMap.set(hash, session);
        }
        continue;
      }

      const choice = await askUser(existingSession, session);
      if (choice === 2) {
        uniqueUserSessionsMap.set(hash, session);
      }
      continue;
    }
    // Also filter out those that don't have any chat text or no answer.
    const searchPattern = /Answer\s?:/;
    if (
      !session.chat_text ||
      session.chat_text.length === 0 ||
      !searchPattern.test(session.chat_text)
    ) {
      // console.log('Exclude entry with chat: \n', session.chat_text);
      continue;
    }
    uniqueUserSessionsMap.set(hash, session);
  }

  const uniqueUserSessions = Array.from(uniqueUserSessionsMap.values()).sort(
    (a, b) => a.session_id.localeCompare(b.session_id)
  );

  console.log(
    `Ommitted ${count} duplicates out of ${userSessions.length} total sessions. Remaining: ${uniqueUserSessions.length}`
  );
  return uniqueUserSessions;
}

function getUniqueHostSessions(
  hostSessions: s.NewHostSession[]
): s.NewHostSession[] {
  const hostMap = new Map<string, s.NewHostSession>();
  hostSessions.sort((a, b) => {
    if (!a.last_edit || !b.last_edit) {
      if (!a.last_edit && !b.last_edit) {
        return 0;
      }
      if (!a.last_edit) {
        return 1;
      }
      return -1;
    }
    // Because sometimes we get this from a file, the date might be in string from, so we need to create a proper date for it.
    return new Date(b.last_edit).getTime() - new Date(a.last_edit).getTime();
  });

  hostSessions.forEach((hostSession) => {
    // I believe all ids should be set...
    if (!hostSession.id) {
      throw new Error('Host session id is not set');
    }
    if (hostMap.has(hostSession.id)) {
      console.log(
        `Duplicate host session: New vs Old:`,
        hostMap.get(hostSession.id),
        hostSession
      );
      return; // Duplicate entry, skip it. (The first one is the newer one, because they're sorted by last_edit)
    }
    hostMap.set(hostSession.id, hostSession);
    return;
  });

  return Array.from(hostMap.values());
}

async function getAllSessionsCombined(): Promise<{
  host: s.NewHostSession[];
  user: s.NewUserSession[];
}> {
  const sessionsFromMake = await getSessionsFromMake();
  if (sessionsFromMake === null) {
    console.log('No sessions found in Make');
    return { host: [], user: [] };
  }
  const asSessionData = transformMakeToPostgres(sessionsFromMake);
  const userSessionsFromMake: s.NewUserSession[] = asSessionData.userSessions;
  const hostSessionsFromMake: s.NewHostSession[] = asSessionData.hostSessions;

  // Combine the make sessions with the ones that we already have in the database, then deduplicate them
  const userSessions = (await db
    .selectFrom(userDbName)
    .selectAll()
    .execute()) as s.NewUserSession[];

  const hostSessions = (await db
    .selectFrom(hostDbName)
    .selectAll()
    .execute()) as s.NewHostSession[];

  hostSessions.push(...hostSessionsFromMake);
  userSessions.push(...userSessionsFromMake);
  userSessions.sort((a, b) => a.session_id.localeCompare(b.session_id));

  return { host: hostSessions, user: userSessions };
}

function transformMakeToPostgres(data: {
  hostData: DbRecord[];
  userData: DbRecord[];
}) {
  const allUserSessions: s.NewUserSession[] = [];
  const allHostSessions: s.NewHostSession[] = [];

  const withoutIncompleteHostRecords = data.hostData.filter(
    (hostRecord: DbRecord) => {
      const hostData = hostRecord.data as RawSessionOverview;
      if (!hostData.topic || !hostData.start_time || !hostData.template) {
        console.log(
          `Skip old host record that doesn't even have a topic, template or start time yet: ${hostData.id}`
        );
        return false;
      }
      return true;
    }
  );
  console.log(
    `After filtering out incomplete host records, there are ${withoutIncompleteHostRecords.length} host records left.`
  );
  withoutIncompleteHostRecords.map((hostRecord) => {
    const hostData = hostRecord.data as RawSessionOverview;
    const userSessions: s.NewUserSession[] = data.userData
      .filter((user) => {
        const data = user.data as UserSessionData;
        return (
          data.session_id === hostRecord.key &&
          !(
            (data.chat_text == null || data.chat_text?.length === 0) &&
            skipEmptyUserSessions
          )
        );
      })
      .map((userRecord): s.NewUserSession => {
        const data = userRecord.data as UserSessionData;
        return {
          active:
            typeof data.active === 'number'
              ? Math.ceil(data.active) > 0
              : !!data.active,
          step: typeof data.active === 'number' ? data.active : 1,
          start_time: new Date(),
          last_edit: new Date(),
          session_id: hostRecord.key,
          user_id: data.user_id ?? 'Anonymous',
          feedback: data.feedback,
          chat_text: data.chat_text,
          thread_id: data.thread_id,
          template: data.template ?? 'unknown',
          user_name: data.chat_text
            ? extractName(data.chat_text)
            : 'Unknown User',
        };
      });

    const hostSession: s.NewHostSession = {
      id: hostRecord.key,
      active:
        typeof hostData.active === 'number'
          ? Math.ceil(hostData.active) > 0
          : !!hostData.active,
      num_sessions: userSessions.length, // Todo
      num_finished: userSessions.filter((data) => !data.active).length,
      prompt: 'unknown',
      summary: hostData.summary,
      template: hostData.template,
      topic: hostData.topic,
      context: hostData.context,
      client: hostData.client,
      final_report_sent: hostData.final_report_sent ?? false,
      start_time: hostData.start_time,
      last_edit: hostData.start_time
        ? new Date(hostData.start_time)
        : undefined,
    };

    // if (skipEmptyHostSessions && hostSession.num_sessions === 0) {
    //   console.log('No user sessions in ', hostRecord.key);
    //   return;
    // }
    console.log('Adding a host session + user sessions');
    allHostSessions.push(hostSession);
    allUserSessions.push(...userSessions);
  });
  return {
    hostSessions: allHostSessions,
    userSessions: allUserSessions,
  };
}

async function migrateFromMake() {
  const data = await getSessionsFromMake();
  if (!data) return;

  await setupTables(dbConfig);

  let allData: AssociatedSessions = {};

  await Promise.all(
    data.hostData.map(async (hostRecord: DbRecord) => {
      const hostData = hostRecord.data as RawSessionOverview;
      if (!hostData.topic || !hostData.start_time || !hostData.template) {
        console.log(
          `Skip old record that doesn't even have a topic, template or start time yet: `,
          hostData
        );
        return;
      }
      const userSessions: s.NewUserSession[] = data.userData
        .filter((user) => {
          const data = user.data as UserSessionData;
          return (
            data.session_id === hostRecord.key &&
            !(
              (data.chat_text == null || data.chat_text?.length === 0) &&
              skipEmptyUserSessions
            )
          );
        })
        .map((userRecord): s.NewUserSession => {
          const data = userRecord.data as UserSessionData;
          return {
            active:
              typeof data.active === 'number'
                ? Math.ceil(data.active) > 0
                : !!data.active,
            step: typeof data.active === 'number' ? data.active : 1,
            start_time: new Date(),
            last_edit: new Date(),
            session_id: hostRecord.key,
            user_id: data.user_id ?? 'Anonymous',
            feedback: data.feedback,
            chat_text: data.chat_text,
            thread_id: data.thread_id,
            template: data.template ?? 'unknown',
          };
        });

      const hostSession: s.NewHostSession = {
        id: hostRecord.key,
        active:
          typeof hostData.active === 'number'
            ? Math.ceil(hostData.active) > 0
            : !!hostData.active,
        num_sessions: userSessions.length, // Todo
        num_finished: userSessions.filter((data) => !data.active).length,
        prompt: 'unknown',
        summary: hostData.summary,
        template: hostData.template,
        topic: hostData.topic,
        context: hostData.context,
        client: hostData.client,
        final_report_sent: hostData.final_report_sent ?? false,
        start_time: hostData.start_time,
        last_edit: new Date(),
      };

      if (skipEmptyHostSessions && hostSession.num_sessions === 0) {
        console.log('No user sessions in ', hostRecord.key);
        return;
      }

      let entry: HostAndAssociatedUsers = {
        host: hostSession,
        users: userSessions,
      };

      allData[hostRecord.key] = entry;

      console.log(
        `Inserting: Host ${hostSession.id} (${hostSession.topic}): ${userSessions.length} user sessions`
      );

      upsertHostSession(
        {
          num_finished: 0,
          num_sessions: 1,
          active: true,
          topic: 'xyz',
          final_report_sent: true,
        },
        'update'
      );

      // upsertHostSession(hostSession, 'update');
      if (userSessions.length > 0) {
        upsertUserSessions(userSessions);
      }
    })
  );

  // Log the grouping stats
  console.log('\nMigration Statistics:');
  const dataEntries = Object.entries(allData);
  console.log(
    `\nTotal: ${dataEntries.length} host sessions, 
    ${dataEntries.reduce(
      (sum, [id, { host, users }]) => sum + users.length,
      0
    )} user sessions\n`
  );
}
async function setUserNames() {
  // Most entries in the user table have user_id = 'anonymous'; only very few have an email or such.
  // We can extract a username from the chat text for many of them.
  // Set that username as a new column 'user_name'.
  const allUserData = await dbConfig.db
    .selectFrom(userDbName)
    .selectAll()
    .execute();
  allUserData.map((user) => {
    if (user.chat_text) {
      const name = extractName(user.chat_text);
      console.log(`Setting ${user.id} to ${name}`);
      dbConfig.db
        .updateTable(userDbName)
        .set({ user_name: name })
        .where('id', '=', user.id)
        .execute();
    }
  });
}

function extractName(input: string): string {
  const prefix = ' : User name is ';
  const startIndex = input.indexOf(prefix);
  if (startIndex === -1) return 'anonymous';

  let nameStart = startIndex + prefix.length;
  const nameRegex =
    /(?:my name is|i am|i'm|call me|hey there,?\s+(?:i am|i'm)|hello[,!]?\s+(?:my name is|i am|i'm))[\s:]*\s*/i;
  const nameMax = input.substring(nameStart).search(/[.!\n]/);
  const match = input
    .substring(nameStart, Math.min(input.length, nameMax))
    .match(nameRegex);
  if (match) {
    nameStart += match[0].length;
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

async function testOperations() {
  upsertUserSessions([
    {
      session_id: '579908108290',
      user_id: 'anonymous',
      active: false,
      chat_text: `Stupid test superkalifragilistic`,
      template: 'not available',
      start_time: new Date('2025-11-14 01:53:54.494'),
      step: 0,
      last_edit: new Date('2026-11-14 02:06:28.597'),
    },
  ]);
}

export async function upsertHostSession(
  data: s.NewHostSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  try {
    await dbConfig.db
      .insertInto('host_local')
      .values(data)
      .onConflict((oc) =>
        onConflict === 'skip'
          ? oc.column('id').doNothing()
          : oc.column('id').doUpdateSet(data)
      )
      .execute();
  } catch (error) {
    console.error('Error upserting host session:', error);
    console.log('HostSession: ', data);
    throw error;
  }
}

export async function upsertUserSessions(
  data: s.NewUserSession[],
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  for (const record of data) {
    // First check if this combination exists and is unique
    const existing = await db
      .selectFrom(userDbName)
      .select(['id'])
      .where('session_id', '=', record.session_id)
      .where('user_id', '=', record.user_id)
      .execute();

    if (existing.length === 1) {
      // Only update if exactly one match exists
      await db
        .updateTable(userDbName)
        .set({
          active: record.active,
          chat_text: record.chat_text,
          feedback: record.feedback,
          last_edit: new Date(),
        })
        .where('session_id', '=', record.session_id)
        .where('user_id', '=', record.user_id)
        .execute();
    } else if (existing.length === 0) {
      // Insert new record if no match exists
      await db.insertInto(userDbName).values(record).execute();
    }
    // If multiple matches exist (length > 1), skip this record
  }
}

export async function insertUserSessions(
  data: s.NewUserSession[]
): Promise<string[]> {
  try {
    const result = await db
      .insertInto(userDbName)
      .values(data[0])
      .returningAll()
      .execute();
    return result.map((row) => row.id);
  } catch (error) {
    console.error('Error inserting user sessions:', error);
    console.log('UserSessions: ', data);
    throw error;
  }
}

function getMakeUrl(
  storeId: number,
  includeLimit: boolean = true,
  offset: number = 20
) {
  return (
    `https://eu2.make.com/api/v2/data-stores/${storeId}/data` +
    (includeLimit ? '?pg[limit]=' + limit + '&pg[offset]=' + offset : '')
  );
  // + (sortBy? "&pg[sortBy]=" + sortBy : "") // Sorting not allowed for this api 😢
}

export async function getSessionsFromMake() {
  try {
    console.log('Getting sessions from make.com');
    const allHostRecords = await iterateToGetAllEntries('host');
    const allUserRecords = await iterateToGetAllEntries('user');
    // const allUserRecords: DbRecord[] = [];
    console.log('✅ Got all sessions from make.com');

    const filteredClientRecords: DbRecord[] = [];
    if (!clientId) {
      console.log('Keeping all sessions not belonging to a client');
      // get all sessions that do NOT belong to any client, mainly for internal testing purposes
      const noClientEntries =
        allHostRecords?.filter(
          (sessionData) =>
            !('client' in sessionData.data) ||
            sessionData.data.client === null ||
            sessionData.data.client === ''
        ) || [];
      filteredClientRecords.push(...noClientEntries);
    } else if (clientId === 'ALL') {
      filteredClientRecords.push(...allHostRecords);
    } else {
      const withClient =
        allHostRecords?.filter(
          ({ data }) => (data as RawSessionOverview).client === clientId
        ) || [];
      filteredClientRecords.push(...withClient);
    }

    console.log(
      `Session data after filtering ClientID '${clientId}': `,
      filteredClientRecords.length
    );

    console.log('Got user data: ', allUserRecords?.length || 0);
    return {
      hostData: filteredClientRecords,
      userData: allUserRecords,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function iterateToGetAllEntries(
  dbName: 'user' | 'host'
): Promise<DbRecord[]> {
  let offset = 0;
  const host = dbName === 'host';
  let allRecords: DbRecord[] = [];
  while (true) {
    console.log(
      `Getting batch ${offset} - ${offset + limit} from ${
        host ? 'host' : 'user'
      } store`
    );
    const batch = await fetch(
      getMakeUrl(host ? sessionStore : userStore, true, offset),
      {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    try {
      const batchJson = await batch.json();
      if (!batchJson.records || batchJson.records.length === 0) {
        return allRecords;
      } else {
        allRecords.push(...batchJson.records);
      }
    } catch (error) {
      console.error(error);
      console.log('Batch object:', batch);
      throw error;
    }
    offset += limit;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
