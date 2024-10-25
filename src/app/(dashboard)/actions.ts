import { deleteSessionById } from '@/lib/db';
import { AccumulatedSessionData, ApiAction, ApiTarget } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { SessionData } from './sessions-table';
import { sendApiCall } from '@/lib/utils';

export async function deleteSession(session: SessionData) {
  // TODO - for vercel DB:
  // let id = Number(formData.get('id'));
  // await deleteSessionById(id);

  // This here is for deleting from make.com db:
  // console.log(`Deleting `, session);
  const userIds = Object.keys(session.userData);
  const hostId = session.sessionId;
  const assistantId = session.hostData.template;
  // console.log(`SessionID: `, hostIds);

  if (
    confirm(
      `Are you sure you want to delete this session and all associated data? \n\n${session.name} - ${hostId}`
    )
  ) {

    await deleteAssistant(assistantId);
    // We're not deleting the user data for now, we might want to analyze the quality a bit...
    // await deleteUserData(userIds);
    // we can however delete the host data, since there's not really any important information in here.
    await deleteHostData(hostId);
  }

  console.log('Deleted Assistant, User Sessions & Host Session');
  return true;
}

async function deleteAssistant(assistantId: string) {
  if (assistantId) {
    console.log(`Deleting ${assistantId} from OpenAI...`);

    await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.DeleteAssistants,
      data: {
        assistantIds: [assistantId],
      },
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      console.log(`Deleted ${assistantId} from OpenAI.`);
    });
  }
}


async function deleteHostData(hostId: string) {
  if (hostId) {
    console.log(`Deleting ${hostId} from host db...`);
    let response = await fetch('api/sessions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: hostId, database: 'session' }),
    });

    if (!response.ok) {
      console.error(
        'There was a problem deleting ids:',
        response.status,
        response.statusText
      );
    }

    console.log(`Deleted ${hostId} from host db...: ${await response.text()}`);
  }
}

async function deleteUserData(userIds: string[]) {
  if (userIds.length > 0) {
    console.log(`Deleting ${userIds} from user db...`);

    let response = await fetch('api/sessions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: userIds, database: 'user' }),
    });

    if (!response.ok) {
      console.error(
        'There was a problem deleting ids:',
        response.status,
        response.statusText
      );
    }
    console.log(`Deleted ${userIds} from user db...: ${await response.text()}`);
  }
}