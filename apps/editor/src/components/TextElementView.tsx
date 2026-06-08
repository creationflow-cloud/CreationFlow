import type { CreationFlowTextElement } from "@creationflow/schema";

interface TextElementViewProps {
  readonly element: CreationFlowTextElement;
}

export function TextElementView({ element }: TextElementViewProps) {
  return (
    <div
      className="text-element-view"
      style={{
        fontSize: `${element.fontSize}px`,
        fontFamily: element.fontFamily,
        color: element.color,
        textAlign: element.align,
        fontWeight: element.fontWeight,
      }}
    >
      {element.text}
    </div>
  );
}

interface InlineTextEditorProps {
  readonly element: CreationFlowTextElement;
  readonly onCommit: (text: string) => void;
  readonly onCancel: () => void;
}

export function InlineTextEditor({ element, onCommit, onCancel }: InlineTextEditorProps) {
  return (
    <textarea
      autoFocus
      className="text-element-inline-editor"
      defaultValue={element.text}
      style={{
        fontSize: `${element.fontSize}px`,
        fontFamily: element.fontFamily,
        color: element.color,
        textAlign: element.align,
        fontWeight: element.fontWeight,
        width: "100%",
        height: "100%",
      }}
      onBlur={(event) => onCommit(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onCommit(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
