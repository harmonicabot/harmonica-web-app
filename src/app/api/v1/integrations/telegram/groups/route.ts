import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../_lib/auth';
import { internalError, validationError } from '../../../_lib/errors';
import { listTelegramGroupsForUser, upsertTelegramGroup } from '@/lib/db';
import type {
  TelegramGroupResponse,
  RegisterTelegramGroupRequest,
} from '@/lib/api-types';

export async function GET() {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const groups = await listTelegramGroupsForUser(user.id);

    const data: TelegramGroupResponse[] = groups.map((g) => ({
      group_id: g.group_id,
      group_name: g.group_name,
      topic_id: g.topic_id,
      created_at: g.created_at.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/v1/integrations/telegram/groups:', error);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  try {
    const body = (await req.json()) as RegisterTelegramGroupRequest;

    if (!body.group_id?.trim()) {
      return validationError('group_id is required');
    }

    const group = await upsertTelegramGroup(
      user.id,
      body.group_id.trim(),
      body.group_name?.trim() ?? null,
      body.topic_id ?? null,
    );

    const data: TelegramGroupResponse = {
      group_id: group.group_id,
      group_name: group.group_name,
      topic_id: group.topic_id,
      created_at: group.created_at.toISOString(),
    };

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v1/integrations/telegram/groups:', error);
    return internalError();
  }
}
