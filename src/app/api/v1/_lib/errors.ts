import { NextResponse } from 'next/server';
import type { ApiErrorCode } from '@/lib/api-types';

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const unauthorized = (msg = 'Authentication required') =>
  apiError('unauthorized', msg, 401);

export const forbidden = (msg = "You don't have access to this resource") =>
  apiError('forbidden', msg, 403);

export const notFound = (msg = 'Resource not found') =>
  apiError('not_found', msg, 404);

export const validationError = (msg: string) =>
  apiError('validation_error', msg, 400);

export const internalError = (msg = 'Internal server error') =>
  apiError('internal_error', msg, 500);
