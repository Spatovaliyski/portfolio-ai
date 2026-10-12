import { ArrayFieldEditor } from './ArrayFieldEditor.tsx';
import { PrimitiveFieldEditor } from './PrimitiveFieldEditor.tsx';
import { titleCase, type Value } from './fieldValues.ts';

export function FieldEditor({
  value,
  onChange,
  label,
  path = '',
}: {
  value: Value;
  onChange: (value: Value) => void;
  label: string;
  path?: string;
}) {
  if (Array.isArray(value))
    return <ArrayFieldEditor value={value} onChange={onChange} label={label} path={path} />;

  if (value !== null && typeof value === 'object')
    return (
      <fieldset className="editor-group">
        <legend>{label}</legend>
        {Object.entries(value)
          .filter(([key]) => !['publicPath', 'variants'].includes(key))
          .map(([key, field]) => (
            <FieldEditor
              key={key}
              label={titleCase(key)}
              value={field}
              path={`${path}.${key}`}
              onChange={(next) => onChange({ ...value, [key]: next })}
            />
          ))}
      </fieldset>
    );

  if (typeof value === 'boolean')
    return (
      <label className="checkbox">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );

  return <PrimitiveFieldEditor value={value} onChange={onChange} label={label} path={path} />;
}
