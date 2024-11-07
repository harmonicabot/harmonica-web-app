import { getSessionsFromMake } from '@/lib/db';
import { AccumulatedSessionData } from './lib/types';
import * as db from '@/lib/db';
import { NewUserSession } from './lib/schema';

async function migrateFromMake() {
  const accumulatedSessions: Record<string, AccumulatedSessionData> | null =
    await getSessionsFromMake();
  console.log('Got sessions from Make for migration:', accumulatedSessions);
  if (accumulatedSessions !== null) {
    Object.entries(accumulatedSessions).forEach(
      ([session_id, hostAndUserData]) => {
        const sessionData = hostAndUserData.session_data;
        const {
          id: id,
          session_active: active,
          num_active: _unused,
          num_finished: finished        } = sessionData;
        const session_data = {
          id,
          prompt: 'unknown',
          num_sessions: sessionData.num_sessions ?? 0,
          active: active ?? false,
          finished: finished ?? 0,
          summary: sessionData.summary,
          template: sessionData.template ?? 'unknown',
          topic: sessionData.topic ?? 'Untitled',
          context: sessionData.context,
          client: sessionData.client,
          final_report_sent: sessionData.final_report_sent ?? false,
          start_time: sessionData.start_time ?? new Date().toISOString()
        };          
        console.log(
          `Migrating session ${session_id} to NeonDB: `,
          session_data
        );
        db.upsertHostSession(session_data, 'update').then(() =>
          console.log(`inserted ${session_id} into host db`)
        );

        const userData = hostAndUserData.user_data;
        const adjustedUserData = Object.entries(userData)
          .filter(([, data]) => data.chat_text)
          .map(
          ([userId, data]) => {
            return {
              session_id,
              user_id: userId,
              template: data.template ?? 'unknown',
              feedback: data.feedback,
              chat_text: data.chat_text,
              thread_id: data.thread_id ?? 'unknown',
              result_text: data.result_text,
              bot_id: data.bot_id,
              host_chat_id: data.host_chat_id,
              start_time: new Date(),
              active: data.active ?? false,
              last_edit: new Date(),
            } as NewUserSession;
          }
        )
        
        if (adjustedUserData.length > 0) {
          console.log(`inserting UserData:`, adjustedUserData);
          db.insertUserSessions(adjustedUserData)
            .catch(error => console.error('Something went wrong inserting user sessions: ', error));
        }
      }
    );
  }
}

migrateFromMake();