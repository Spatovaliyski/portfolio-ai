import { useId } from 'react';
import type { Value } from './fieldValues.ts';

export function PrimitiveFieldEditor({
  value,
  onChange,
  label,
  path,
}: {
  value: Value;
  onChange: (value: Value) => void;
  label: string;
  path: string;
}) {
  const id = useId();
  const choices: Record<string, string[]> = {
    kind: ['product', 'professional', 'pet-project', 'archive'],
    status: ['active', 'maintained', 'completed', 'experimental', 'archived'],
  };
  const key = path.split('.').at(-1)!;

  if (choices[key] && typeof value === 'string' && choices[key].includes(value))
    return (
      <label htmlFor={id}>
        {label}
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {choices[key].map((choice) => (
            <option key={choice}>{choice}</option>
          ))}
        </select>
      </label>
    );

  if (typeof value === 'number')
    return (
      <label htmlFor={id}>
        {label}
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );

  const multiline =
    /markdown|biography|introduction|summary|description|context|choice|alternatives|consequence|explanation|code|details|ownership/.test(
      key,
    );
  const nullable =
    value === null ||
    ['end', 'since', 'sourceUrl', 'cvMediaId', 'heroMediaId', 'projectId'].includes(key);

  return (
    <label htmlFor={id}>
      {label}
      {multiline ? (
        <textarea
          id={id}
          rows={key === 'markdown' || key === 'code' ? 8 : 3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || (nullable ? null : ''))}
        />
      ) : (
        <input
          id={id}
          value={String(value ?? '')}
          type={
            key === 'email'
              ? 'email'
              : ['start', 'end', 'since', 'publishedAt', 'modifiedAt', 'verifiedAt'].includes(key)
                ? 'date'
                : 'text'
          }
          onChange={(e) => onChange(e.target.value || (nullable ? null : ''))}
        />
      )}
      {key === 'markdown' && (
        <small>Markdown is supported; raw HTML and executable embeds are disabled.</small>
      )}
    </label>
  );
}
