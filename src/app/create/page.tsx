import { getGeneratedMetadata } from "app/api/metadata/metadata";
import CreationFlow from "./creationFlow";

export const metadata = getGeneratedMetadata('/create');

export default function Create() {
  return <CreationFlow/>
}