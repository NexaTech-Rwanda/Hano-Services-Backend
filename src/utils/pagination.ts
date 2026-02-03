export interface CursorPayload {
  id: string;
  createdAt: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

export function decodeCursor(cursor: string | undefined | null): CursorPayload | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.createdAt === 'string') {
      return { id: parsed.id, createdAt: parsed.createdAt };
    }
    return null;
  } catch {
    return null;
  }
}

export function getNextCursor<T>(
  rows: T[],
  getId: (row: T) => string,
  getCreatedAt: (row: T) => Date | string | null | undefined
): string | null {
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const id = getId(last);
  const createdAt = getCreatedAt(last);
  if (!id || !createdAt) return null;
  const createdAtIso =
    createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  return encodeCursor({ id, createdAt: createdAtIso });
}

