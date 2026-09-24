export const DEFAULT_PAGE_SIZE = 25;

/** Fetch one extra doc to detect whether another page exists. */
export function pageFetchLimit(pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, pageSize) + 1;
}

export type CursorPage<T> = {
  items: T[];
  /** Document id to pass as `cursorId` for the next page. */
  nextCursorId: string | null;
  hasMore: boolean;
};
