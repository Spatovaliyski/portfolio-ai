import type { ContentBlock } from '../../../../domain/schema.ts';
import { FieldEditor } from './fields/FieldEditor.tsx';
import { OrderingControls } from './fields/OrderingControls.tsx';
import { titleCase, moveItem, type Value } from './fields/fieldValues.ts';
import { newBlock } from './newBlock.ts';

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  return (
    <fieldset className="block-editor">
      <legend>Content blocks</legend>
      {blocks.map((block, index) => (
        <section key={block.id} className="editable-block">
          <header>
            <h3>
              {index + 1}. {titleCase(block.type)}
            </h3>
            <OrderingControls
              index={index}
              total={blocks.length}
              onMove={(offset) => onChange(moveItem(blocks, index, offset))}
              onRemove={() => onChange(blocks.filter((_, blockIndex) => blockIndex !== index))}
            />
          </header>
          {Object.entries(block)
            .filter(([key]) => !['id', 'type'].includes(key))
            .map(([key, value]) => (
              <FieldEditor
                key={key}
                label={titleCase(key)}
                value={value as Value}
                path={key}
                onChange={(next) =>
                  onChange(
                    blocks.map((b, i) =>
                      i === index ? ({ ...b, [key]: next } as ContentBlock) : b,
                    ),
                  )
                }
              />
            ))}
        </section>
      ))}
      <label>
        Add a block
        <select
          defaultValue=""
          onChange={(event) => {
            if (event.target.value)
              onChange([...blocks, newBlock(event.target.value as ContentBlock['type'])]);
            event.target.value = '';
          }}
        >
          <option value="">Choose a block type</option>
          {[
            'prose',
            'heading',
            'image',
            'gallery',
            'summary',
            'decision',
            'code',
            'diagram',
            'links',
            'related',
            'metric',
          ].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
