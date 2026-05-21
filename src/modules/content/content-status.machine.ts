import { ContentStatus } from '@prisma/client';

const VALID: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: [ContentStatus.GENERATING],
  GENERATING: [ContentStatus.READY, ContentStatus.FAILED],
  READY: [ContentStatus.SCHEDULED],
  SCHEDULED: [ContentStatus.PUBLISHING],
  PUBLISHING: [ContentStatus.PUBLISHED, ContentStatus.FAILED],
  PUBLISHED: [],
  FAILED: [ContentStatus.DRAFT],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return VALID[from]?.includes(to) ?? false;
}
