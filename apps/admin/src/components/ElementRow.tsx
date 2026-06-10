interface ElementRowProps {
  readonly element: Record<string, unknown>;
  readonly elementIndex: number;
  readonly onUpdate: (patch: {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => void;
  readonly onDelete: () => void;
}

export function ElementRow({ element, elementIndex, onUpdate, onDelete }: ElementRowProps) {
  const id = String(element.id ?? "");
  const name = String(element.name ?? element.type ?? "Element");
  const type = String(element.type ?? "element");
  const x = Number(element.x ?? 0);
  const y = Number(element.y ?? 0);
  const width = Number(element.width ?? 0);
  const height = Number(element.height ?? 0);

  return (
    <div key={`${id}-${elementIndex}`} className="element-row" role="listitem">
      <div className="element-row-summary">
        <span className="element-type-badge">{type}</span>
        <input
          className="element-name-input"
          type="text"
          value={name}
          onChange={(event) => onUpdate({ name: event.target.value })}
          aria-label={`Element ${elementIndex + 1} name`}
        />
        <button
          type="button"
          className="delete-element-btn"
          onClick={onDelete}
          aria-label={`Delete element ${elementIndex + 1}`}
        >
          Remove
        </button>
      </div>
      <div className="element-dims">
        <label>
          X
          <input
            className="dim-input"
            type="number"
            value={x}
            onChange={(event) => onUpdate({ x: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          Y
          <input
            className="dim-input"
            type="number"
            value={y}
            onChange={(event) => onUpdate({ y: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          W
          <input
            className="dim-input"
            type="number"
            value={width}
            onChange={(event) => onUpdate({ width: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          H
          <input
            className="dim-input"
            type="number"
            value={height}
            onChange={(event) => onUpdate({ height: Number(event.target.value) || 0 })}
          />
        </label>
      </div>
    </div>
  );
}
