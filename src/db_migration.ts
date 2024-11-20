import * as s from './lib/schema';
import { createKysely } from '@vercel/postgres-kysely';
type Client = 'CMI' | 'DEV' | 'APP' | 'ALL' | '' | undefined;

// Set this if you want to migrate only a subset of the data
const clientId: Client = 'ALL';
const hostDbName = 'host_db'; // For the 'real' migration, replace this with 'host_data'
const userDbName = 'user_db'; // For the 'real' migration, replace this with 'user_data'
const updateOrCreateNewTables = true;
const dropTablesIfAlreadyPresent = false;
const skipEmptyHostSessions = true;
const skipEmptyUserSessions = true;

// Run this with:
// `npx tsx -r dotenv /config src/db_migration.ts dotenv_config_path=.env.local`

//////////////////////////////////////////////////////
// you shouldn't need to touch anything below this: //
//////////////////////////////////////////////////////
interface Databases {
  [hostDbName]: s.HostSessionsTable;
  [userDbName]: s.UserSessionsTable;
}

const db = createKysely<Databases>();
async function setupTables() {
  if (!updateOrCreateNewTables) return;
  if (dropTablesIfAlreadyPresent) {
    await db.schema.dropTable(hostDbName).ifExists().execute();
    await db.schema.dropTable(userDbName).ifExists().execute();
  }
  await s.createHostTable(db, hostDbName).then(() => s.createTriggerOnHostUpdateLastEditSummary(hostDbName));
  await s.createUserTable(db, userDbName).then(() => s.createTriggerOnUserUpdateLastEditChatText(userDbName));
}

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

async function migrateFromMake() {
  const data = await getSessionsFromMake();
  if (!data) return;

  await setupTables();

  let allData: AssociatedSessions = {};

  await Promise.all(
    data.hostData.map(async (hostRecord: DbRecord) => {
      const hostData = hostRecord.data as RawSessionOverview;
      if (!hostData.topic || !hostData.start_time || !hostData.template) {
        console.log(`Skip old record that doesn't even have a topic, template or start time yet: `, hostData);
        return;
      }
      const userSessions: s.NewUserSession[] = data.userData
        .filter(
          (user) => {
            const data = user.data as UserSessionData;
            return data.session_id === hostRecord.key
              && !((data.chat_text == null || data.chat_text?.length === 0) && skipEmptyUserSessions);
          }
        )
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
            summary: data.result_text,
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
        console.log('No user sessions in ', hostRecord.key)
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

      upsertHostSession(hostSession, 'update');
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

export async function upsertHostSession(
  data: s.NewHostSession,
  onConflict: 'skip' | 'update' = 'skip'
): Promise<void> {
  try {
    await db
      .insertInto(hostDbName)
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
  await db
    .insertInto(userDbName)
    .values(data)
    .onConflict((oc) =>
      onConflict === 'skip'
        ? oc.column('id').doNothing()
        : oc.column('id').doUpdateSet((eb) => ({
            active: eb.ref('excluded.active'),
            chat_text: eb.ref('excluded.chat_text'),
            feedback: eb.ref('excluded.feedback'),
            last_edit: eb.ref('excluded.last_edit')
        }))
    )
    .execute();
}

export async function insertUserSessions(
  data: s.NewUserSession | s.NewUserSession[]
): Promise<string[]> {
  try {
    const result = await db
      .insertInto(userDbName)
      .values(data)
      .returningAll()
      .execute();
    return result.map((row) => row.id);
  } catch (error) {
    console.error('Error inserting user sessions:', error);
    console.log('UserSessions: ', data);
    throw error;
  }
}

// #### Legacy make.com db stuff ####
const sessionStore = 17957;
const userStore = 17913;

let limit = 100;
const token = process.env.MAKE_AUTH_TOKEN;

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

type DbRecord = {
  key: string;
  data: UserSessionData | RawSessionOverview;
};

export async function getSessionsFromMake() {
  // Only called from db migration
  try {
    console.log('Getting sessions from make.com');
    const allHostRecords = await iterateToGetAllEntries('host');
    const allUserRecords = await iterateToGetAllEntries('user');
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


migrateFromMake().then(() => {
  console.log('Migration complete.');
});