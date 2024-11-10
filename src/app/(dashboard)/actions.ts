import { deleteHostSession, deleteSessionById } from '@/lib/db';
import { HostAndUserData, ApiAction, ApiTarget } from '@/lib/types';
import { sendApiCall } from '@/lib/utils';

export async function deleteSession(session: HostAndUserData) {
  // TODO - for vercel DB:
  // let id = Number(formData.get('id'));
  // await deleteSessionById(id);

  // This here is for deleting from make.com db:
  // console.log(`Deleting `, session);
  const userIds = session.user_data.map((user) => user.id);
  const hostId = session.host_data.id;
  const assistantId = session.host_data.template;
  // console.log(`SessionID: `, hostIds);

  if (
    confirm(
      `Are you sure you want to delete this session and all associated data? \n\n${session.host_data.topic} - ${hostId}`
    )
  ) {

    await deleteAssistant(assistantId);
    // We're not deleting the user data for now, we might want to analyze the quality a bit...
    // await deleteUserData(userIds);
    // we can however delete the host data, since there's not really any important information in here.
    await deleteHostData(hostId);
    console.log('Deleted Assistant & Host Session');
    return true;
  }
  return false;
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
    console.log(`Deleting ${hostId} from make host db...`);
    let response = await fetch(`api/${ApiTarget.Sessions}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: hostId, database: 'session' }),
    });

    if (!response.ok) {
      console.error(
        'There was a problem deleting session from make:',
        response.status,
        response.statusText
      );
    } else {
      console.log(`Deleted ${hostId} from host db...: ${await response.text()}`);
    }
    
    try {
      deleteHostSession(hostId);
      console.log(`Deleted ${hostId} from host db...: ${await response.text()}`);
    } catch (e) {
      console.error(e);
    }
  }
}

async function deleteUserData(userIds: string[]) {
  if (userIds.length > 0) {
    console.log(`Deleting ${userIds} from user db...`);

    let response = await fetch(`api/${ApiTarget.Sessions}`, {
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