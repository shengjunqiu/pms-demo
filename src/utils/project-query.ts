import type { ProjectFilter } from '@/mock/selectors';
export const keys: (keyof ProjectFilter)[] = ['org', 'region', 'type', 'level', 'industry', 'customer', 'pm', 'health', 'from', 'to', 'search'];
export function readProjectFilter(params: URLSearchParams): ProjectFilter {
  return Object.fromEntries(keys.flatMap((key) => params.get(key) && params.get(key) !== 'all' ? [[key, params.get(key)!]] : []));
}
