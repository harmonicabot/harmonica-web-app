import type { HostSession } from '@/lib/schema';
import type { Session, SessionListItem } from '@/lib/api-types';

export function toSessionListItem(hs: HostSession): SessionListItem {
  return {
    id: hs.id,
    topic: hs.topic,
    goal: hs.goal,
    status: hs.active ? 'active' : 'completed',
    participant_count: hs.num_sessions,
    created_at: hs.start_time.toISOString(),
    updated_at: hs.last_edit.toISOString(),
  };
}

export function toSession(hs: HostSession): Session {
  return {
    ...toSessionListItem(hs),
    critical: hs.critical || null,
    context: hs.context || null,
    summary: hs.summary || null,
    session_md: hs.session_md || null,
  };
}
