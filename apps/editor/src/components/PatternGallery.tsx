export interface PatternDefinition {
  readonly id: string;
  readonly name: string;
  readonly svg: string;
}

export const BUILTIN_PATTERNS: readonly PatternDefinition[] = [
  {
    id: "dots",
    name: "Punkte",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="3" fill="currentColor"/></svg>`,
  },
  {
    id: "stripes",
    name: "Streifen",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect x="0" y="0" width="20" height="6" fill="currentColor"/></svg>`,
  },
  {
    id: "crosses",
    name: "Kreuze",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M8 2h4v6h6v4h-6v6h-4v-6H2V8h6z" fill="currentColor"/></svg>`,
  },
  {
    id: "diamonds",
    name: "Rauten",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M10 2l8 8-8 8-8-8z" fill="currentColor"/></svg>`,
  },
  {
    id: "waves",
    name: "Wellen",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M0 10c3-6 7-6 10 0s7 6 10 0" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "zigzag",
    name: "Zickzack",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M0 10l5-8 5 8 5-8 5 8" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "stars",
    name: "Sterne",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M10 2l2.2 5.8H18l-4.5 3.3 1.7 5.9L10 13.5 4.8 17l1.7-5.9L2 7.8h5.8z" fill="currentColor"/></svg>`,
  },
  {
    id: "circles",
    name: "Kreise",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  },
];

interface PatternGalleryProps {
  readonly onAddPattern: (patternId: string) => void;
  readonly onClose: () => void;
}

export function PatternGallery({ onAddPattern, onClose }: PatternGalleryProps) {
  return (
    <div className="pattern-gallery-overlay" onClick={onClose}>
      <div className="pattern-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="pattern-gallery-header">
          <h3>Muster hinzufügen</h3>
          <button className="pattern-gallery-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="pattern-gallery-grid">
          {BUILTIN_PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              className="pattern-gallery-item"
              onClick={() => onAddPattern(pattern.id)}
              title={pattern.name}
            >
              <div
                className="pattern-gallery-preview"
                dangerouslySetInnerHTML={{ __html: pattern.svg }}
              />
              <span className="pattern-gallery-name">{pattern.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
