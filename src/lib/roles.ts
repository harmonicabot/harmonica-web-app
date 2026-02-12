import { PermissionsTable } from '@/lib/schema';

export const ROLE_HIERARCHY = {
  none: 0,
  viewer: 1,
  editor: 2,
  owner: 3,
  admin: 4,
} as const;

export type Role = PermissionsTable['role'];
