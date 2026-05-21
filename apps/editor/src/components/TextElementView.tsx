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
