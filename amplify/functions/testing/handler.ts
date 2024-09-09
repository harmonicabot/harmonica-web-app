import type { Handler } from 'aws-lambda';
import type { Schema } from '../../data/resource';

export const handler: Schema["testing"]["functionHandler"] = async (event, context) => {
  // your function code goes here
  const { name, something } = event.arguments
  return `Hello ${name}! I'm just testing ${something}.`;
};