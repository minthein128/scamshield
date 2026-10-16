import { api } from './api';
import type { AiSource, Collection, Draft, DraftItem } from './types';

export const createDraft = (body: {
  collection: Collection;
  op: Draft['op'];
  item: DraftItem;
  reason: string;
  aiSource?: AiSource;
}) => api<Draft>('/drafts', { body });

export interface Listing<T> { version: number; items: T; drafts?: Draft[] }
