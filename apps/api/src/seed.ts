import { randomUUID } from "node:crypto";
import { PrismaClient } from "@creationflow/database";
import type { Prisma } from "@creationflow/database";

const DEMO_WORKSPACE_NAME = "Demo Workspace";
const DEMO_PRODUCT_NAME = "Demo T-Shirt";
const DEMO_TEMPLATE_NAME = "T-Shirt Front Template";

function buildDemoDocumentSchema(): Record<string, unknown> {
  const documentId = randomUUID();
  const pageId = randomUUID();
  const frontSurfaceId = randomUUID();
  const backSurfaceId = randomUUID();
  const frontTextElementId = randomUUID();
  const frontRectElementId = randomUUID();
  const frontCircleElementId = randomUUID();
  const backTextElementId = randomUUID();
  const backRectElementId = randomUUID();

  return {
    id: documentId,
    version: "1.0.0",
    metadata: {
      name: DEMO_TEMPLATE_NAME,
      workspaceId: "__PLACEHOLDER__",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    pages: [
      {
        id: pageId,
        name: "T-Shirt",
        width: 500,
        height: 600,
        unit: "px",
        surfaces: [
          {
            id: frontSurfaceId,
            name: "Front",
            width: 500,
            height: 600,
            unit: "px",
            kind: "front",
            elements: [
              {
                id: frontRectElementId,
                type: "shape",
                name: "Decorative Frame",
                x: 50,
                y: 50,
                width: 400,
                height: 500,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                shapeType: "rect",
                fill: undefined,
                stroke: "#243b68",
                strokeWidth: 2,
              },
              {
                id: frontTextElementId,
                type: "text",
                name: "Title Text",
                x: 100,
                y: 200,
                width: 300,
                height: 60,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 1,
                text: "Your Design Here",
                fontFamily: "Inter, sans-serif",
                fontSize: 24,
                fontWeight: "700",
                color: "#1d2738",
                align: "center",
              },
              {
                id: frontCircleElementId,
                type: "shape",
                name: "Accent Circle",
                x: 200,
                y: 350,
                width: 100,
                height: 100,
                rotation: 0,
                opacity: 0.8,
                visible: true,
                locked: false,
                zIndex: 2,
                shapeType: "ellipse",
                fill: "#eef1f6",
                stroke: "#d9dee8",
                strokeWidth: 1,
              },
            ],
          },
          {
            id: backSurfaceId,
            name: "Back",
            width: 500,
            height: 600,
            unit: "px",
            kind: "back",
            elements: [
              {
                id: backRectElementId,
                type: "shape",
                name: "Back Frame",
                x: 50,
                y: 50,
                width: 400,
                height: 500,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                shapeType: "rect",
                fill: undefined,
                stroke: "#28a745",
                strokeWidth: 2,
              },
              {
                id: backTextElementId,
                type: "text",
                name: "Back Text",
                x: 100,
                y: 250,
                width: 300,
                height: 60,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 1,
                text: "Back Design",
                fontFamily: "Inter, sans-serif",
                fontSize: 24,
                fontWeight: "700",
                color: "#28a745",
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

export async function seedDemoData(db: PrismaClient): Promise<void> {
  const existingWorkspace = await db.workspace.findFirst({
    where: { name: DEMO_WORKSPACE_NAME },
  });

  if (existingWorkspace) {
    console.log("ℹ️  Demo data already exists. Skipping seed.");
    console.log(`   Workspace ID: ${existingWorkspace.id}`);

    const existingTemplate = await db.productTemplate.findFirst({
      where: { workspaceId: existingWorkspace.id },
      orderBy: { createdAt: "asc" },
    });

    const existingConfig = await db.configuration.findFirst({
      where: { workspaceId: existingWorkspace.id },
      orderBy: { createdAt: "asc" },
    });

    if (existingTemplate) {
      console.log(`   Template ID: ${existingTemplate.id}`);
      console.log(`   Editor URL: http://localhost:5173/?templateId=${existingTemplate.id}`);
    }

    if (existingConfig) {
      console.log(`   Configuration ID: ${existingConfig.id}`);
      console.log(`   Editor URL: http://localhost:5173/?configurationId=${existingConfig.id}`);
    }

    return;
  }

  console.log("🌱 Creating demo workspace...");
  const workspace = await db.workspace.create({
    data: { name: DEMO_WORKSPACE_NAME },
  });
  console.log(`✅ Workspace created: ${workspace.id}`);

  console.log("🌱 Creating demo product...");
  const product = await db.product.create({
    data: {
      workspaceId: workspace.id,
      name: DEMO_PRODUCT_NAME,
    },
  });
  console.log(`✅ Product created: ${product.id}`);

  const documentSchema = buildDemoDocumentSchema();

  console.log("🌱 Creating demo template...");
  const template = await db.productTemplate.create({
    data: {
      workspaceId: workspace.id,
      productId: product.id,
      documentSchema: documentSchema as Prisma.InputJsonValue,
    },
  });
  console.log(`✅ Template created: ${template.id}`);

  const configDocument = {
    ...documentSchema,
    metadata: {
      ...(documentSchema.metadata as Record<string, unknown>),
      workspaceId: workspace.id,
    },
  };

  console.log("🌱 Creating demo configuration...");
  const configuration = await db.configuration.create({
    data: {
      workspaceId: workspace.id,
      productId: product.id,
      templateId: template.id,
      document: configDocument as Prisma.InputJsonValue,
      status: "DRAFT",
    },
  });
  console.log(`✅ Configuration created: ${configuration.id}`);

  console.log("");
  console.log("📝 Editor URLs:");
  console.log(`   http://localhost:5173/?templateId=${template.id}`);
  console.log(`   http://localhost:5173/?configurationId=${configuration.id}`);
  console.log("");
  console.log("🎉 Seed complete!");
}

async function main() {
  const db = new PrismaClient();

  try {
    await db.$connect();
    console.log("🔌 Connected to database.");
    await seedDemoData(db);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

void main();
