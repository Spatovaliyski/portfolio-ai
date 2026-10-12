type Props = {
  labels: Record<string, string>;
  search: string;
  language: string;
  sort: string;
  languages: string[];
  complete: boolean;
  onChange: (field: 'q' | 'language' | 'sort', value: string) => void;
};

export function RepositoryFilters({
  labels,
  search,
  language,
  sort,
  languages,
  complete,
  onChange,
}: Props) {
  return (
    <div className="repo-filters">
      <label>
        {labels.search}
        <input
          type="search"
          value={search}
          onChange={(e) => {
            onChange('q', e.target.value);
          }}
        />
      </label>
      <label>
        {labels.language}
        <select
          value={language}
          onChange={(e) => {
            onChange('language', e.target.value);
          }}
        >
          <option value="">{labels.allLanguages}</option>
          {languages.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        {labels.sort}
        <select
          value={sort}
          onChange={(e) => {
            onChange('sort', e.target.value);
          }}
        >
          <option value="recent">{labels.recent}</option>
          <option value="stars">{labels.stars}</option>
          <option value="active" disabled={!complete}>
            {labels.mostActive}
          </option>
        </select>
      </label>
    </div>
  );
}
