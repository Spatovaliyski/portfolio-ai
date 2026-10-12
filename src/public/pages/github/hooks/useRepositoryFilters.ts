import { useEffect, useState } from 'react';

export function useRepositoryFilters() {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    function readQuery() {
      const query = new URLSearchParams(location.search);

      setSearch(query.get('q') ?? '');
      setLanguage(query.get('language') ?? '');
      setSort(query.get('sort') ?? 'recent');
    }

    readQuery();
    window.addEventListener('popstate', readQuery);

    return () => window.removeEventListener('popstate', readQuery);
  }, []);

  function update(field: 'q' | 'language' | 'sort', value: string) {
    const query = new URLSearchParams(location.search);

    if (value) query.set(field, value);
    else query.delete(field);

    history.replaceState(history.state, '', `${location.pathname}${query.size ? `?${query}` : ''}`);

    if (field === 'q') setSearch(value);
    if (field === 'language') setLanguage(value);
    if (field === 'sort') setSort(value);
  }

  return { search, language, sort, update };
}
