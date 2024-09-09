import type { Schema } from '@/amplify/data/resource';
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/api"
import outputs from "@/amplify_outputs.json"

Amplify.configure(outputs);
const client = generateClient<Schema>();

client.queries.testing({name: "test", something: "something"}).then(res => console.log(res));