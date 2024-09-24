import { defineFunction } from '@aws-amplify/backend';

export const templateBuilder = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'templateBuilder',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './builder.ts'
});