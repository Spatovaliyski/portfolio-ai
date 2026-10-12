export function OrderingControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="row-actions">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)}>
        Move up
      </button>
      <button type="button" disabled={index === total - 1} onClick={() => onMove(1)}>
        Move down
      </button>
      <button type="button" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
