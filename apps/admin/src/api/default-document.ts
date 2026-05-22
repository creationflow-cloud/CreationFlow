export interface DefaultDocumentInput {
  readonly workspaceId: string;
  readonly name?: string;
}

function uid(): string {
  return crypto.randomUUID();
}

export function createDefaultDocument(input: DefaultDocumentInput): Record<string, unknown> {
  const documentId = uid();
  const pageId = uid();
  const surfaceId = uid();
  const textElementId = uid();
  const now = new Date().toISOString();

  return {
    id: documentId,
    version: "1.0.0",
    metadata: {
      workspaceId: input.workspaceId,
      name: input.name ?? "Untitled",
      createdAt: now,
      updatedAt: now,
    },
    pages: [
      {
        id: pageId,
        name: "Front",
        width: 500,
        height: 600,
        unit: "px",
        surfaces: [
          {
            id: surfaceId,
            name: "Front",
            width: 500,
            height: 600,
            unit: "px",
            kind: "front",
            elements: [
              {
                id: textElementId,
                type: "text",
                name: "Placeholder Text",
                x: 100,
                y: 250,
                width: 300,
                height: 40,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                text: "Your Design Here",
                fontFamily: "Inter, sans-serif",
                fontSize: 24,
                fontWeight: "700",
                color: "#1d2738",
                align: "center",
              },
            ],
          },
        ],
      },
    ],
    variables: [],
    assets: [],
    rules: [],
  };
}
