/** Moves an item up or down and keeps `order` aligned with the visible sequence. */
export function moveItem<T extends { order: number; title: string }>(
  items: T[],
  index: number,
  direction: -1 | 1,
): T[] | null {
  const target = index + direction;
  if (target < 0 || target >= items.length) return null;

  if (items[index].order !== items[target].order) {
    const next = items.map((item) => ({ ...item }));
    const order = next[index].order;
    next[index] = { ...next[index], order: next[target].order };
    next[target] = { ...next[target], order };
    return next.sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
    );
  }

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }));
}
