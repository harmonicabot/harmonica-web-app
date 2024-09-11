'use server';

import { deleteSessionById } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteSession(formData: FormData) {
  // TODO
  // let id = Number(formData.get('id'));
  // await deleteSessionById(id);
  // revalidatePath('/');
}
