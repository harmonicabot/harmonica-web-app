import { deleteSessionById } from '@/lib/db';
import { AccumulatedSessionData } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function deleteSession(session: AccumulatedSessionData) {
  // TODO
  // let id = Number(formData.get('id'));
  // await deleteSessionById(id);

  console.log(`Deleting `, session);
  const userIds = Object.keys(session.user_data);
  const hostIds = [Object.values(session.user_data)[0].session_id];
  console.log(`SessionID: `, hostIds);

  if (confirm(`Are you sure you want to delete these user sessions? \n\n${userIds.join('\n')}`)
    && confirm(`Are you sure you want to delete this session? \n\n${session.session_data.topic} - ${hostIds[0]}`)
  ) {
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
      return;
    }
    console.log(`Deleted ${userIds} from user db...: ${await response.text()}`);

    console.log(`Deleting ${hostIds} from host db...`);
    response = await fetch('api/sessions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: hostIds, database: 'session' }),
    });

    if (!response.ok) {
      console.error(
        'There was a problem deleting ids:',
        response.status,
        response.statusText
      );
      return;
    }

    console.log(`Deleted ${hostIds} from host db...: ${await response.text()}`);

  }

  console.log('deleteSession called');
  revalidatePath('/');
}


