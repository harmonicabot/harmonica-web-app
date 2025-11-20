import { getGeneratedMetadata } from 'app/api/metadata';
import TemplatesClient from './TemplatesClient';

export const metadata = getGeneratedMetadata('/templates');

export default function TemplatesPage() {
  return <TemplatesClient />;
}