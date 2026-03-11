import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../_lib/auth';
import { internalError, notFound } from '../../../../_lib/errors';
import { deleteTelegramGroup } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const { groupId } = await params;
    const deleted = await deleteTelegramGroup(user.id, groupId);

    if (!deleted) {
      return notFound('Telegram group not found');
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      'Error in DELETE /api/v1/integrations/telegram/groups/[groupId]:',
      error,
    );
    return internalError();
  }
}
