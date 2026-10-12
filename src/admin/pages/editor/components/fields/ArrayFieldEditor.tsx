import { FieldEditor } from './FieldEditor.tsx';
import { OrderingControls } from './OrderingControls.tsx';
import { moveItem, type Value } from './fieldValues.ts';

export function ArrayFieldEditor({
  value,
  onChange,
  label,
  path,
}: {
  value: Value[];
  onChange: (value: Value) => void;
  label: string;
  path: string;
}) {
  return (
    <fieldset className="editor-group">
      <legend>{label}</legend>
      {value.map((item, index) => (
        <div className="array-row" key={index}>
          <FieldEditor
            label={`${label} ${index + 1}`}
            value={item}
            path={`${path}.${index}`}
            onChange={(next) => onChange(value.map((v, i) => (i === index ? next : v)))}
          />
          <OrderingControls
            index={index}
            total={value.length}
            onMove={(offset) => onChange(moveItem(value, index, offset))}
            onRemove={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          let blank: Value = '';

          if (['links', 'navigation'].includes(path.split('.').at(-1)!))
            blank = { label: '', url: 'https://' };
          else if (path.endsWith('images')) blank = { mediaId: '', alt: '', caption: '' };
          else if (path.endsWith('repositoryIds')) blank = 1;
          else if (value[0] && typeof value[0] === 'object') blank = structuredClone(value[0]);
          onChange([...value, blank]);
        }}
      >
        Add {label.toLowerCase()}
      </button>
    </fieldset>
  );
}
