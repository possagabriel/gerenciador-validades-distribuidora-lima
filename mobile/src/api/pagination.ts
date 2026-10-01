export interface Paginated<T> { count: number; next: string | null; results: T[] }
export type ListResponse<T> = T[] | Paginated<T>;

export function normalizeList<T>(response: ListResponse<T>): { items: T[]; next: string | null; count: number } {
  if (Array.isArray(response)) return { items: response, next: null, count: response.length };
  return { items: response.results, next: response.next, count: response.count };
}

export function pageItems<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}
