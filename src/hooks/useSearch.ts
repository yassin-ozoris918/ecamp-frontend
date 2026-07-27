import { useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';

export function useSearch<T extends object>(
  data: T[],
  fields: (keyof T)[],
  debounceMs: number = 300,
) {
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, debounceMs);

  const results = useMemo(() => {
    if (!debouncedSearch.trim()) return data;
    const query = debouncedSearch.toLowerCase();
    return data.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        return val != null && String(val).toLowerCase().includes(query);
      }),
    );
  }, [data, debouncedSearch, fields]);

  return {
    searchText,
    setSearchText,
    results,
  };
}
