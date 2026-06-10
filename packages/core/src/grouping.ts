import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowGroupElement,
  CreationFlowSurface,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import { addElement, removeElement } from "./elements.js";
import { getElementZIndex, flattenSurfaceElements } from "./layers.js";

export interface GroupElementsResult {
  readonly document: CreationFlowDocument;
  readonly groupId: ElementId;
}

export interface UngroupElementResult {
  readonly document: CreationFlowDocument;
  readonly elementIds: readonly ElementId[];
}

function findElementSurface(
  document: CreationFlowDocument,
  elementId: ElementId,
): { surface: CreationFlowSurface; pageId: PageId } | undefined {
  for (const page of document.pages) {
    for (const surface of page.surfaces ?? []) {
      const all = flattenSurfaceElements(surface);
      if (all.some((el) => el.id === elementId)) {
        return { surface, pageId: page.id };
      }
    }
  }
  return undefined;
}

function computeBoundingBox(elements: readonly CreationFlowElement[]): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const element of elements) {
    if (element.x < minX) minX = element.x;
    if (element.y < minY) minY = element.y;
    if (element.x + element.width > maxX) maxX = element.x + element.width;
    if (element.y + element.height > maxY) maxY = element.y + element.height;
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function groupElements(
  document: CreationFlowDocument,
  surfaceId: SurfaceId,
  elementIds: readonly string[],
): GroupElementsResult | undefined {
  if (elementIds.length < 2) return undefined;
  const context = findElementSurface(document, elementIds[0] as ElementId);
  if (!context) return undefined;
  if (context.surface.id !== surfaceId) return undefined;
  const { surface, pageId } = context;

  const idSet = new Set<string>(elementIds);
  const flatten = flattenSurfaceElements(surface);
  const members: CreationFlowElement[] = [];
  for (const element of flatten) {
    if (element.type === "group") continue;
    if (idSet.has(element.id)) {
      members.push(element);
    }
  }
  if (members.length < 2) return undefined;

  const bbox = computeBoundingBox(members);
  const maxZ = members.reduce(
    (acc, el) => Math.max(acc, getElementZIndex(el)),
    Number.NEGATIVE_INFINITY,
  );

  const groupId = crypto.randomUUID() as ElementId;
  const group: CreationFlowGroupElement = {
    id: groupId,
    type: "group",
    name: "Group",
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: maxZ === Number.NEGATIVE_INFINITY ? 0 : maxZ,
    children: members.map<CreationFlowElement>((member) => ({
      ...member,
      x: member.x - bbox.x,
      y: member.y - bbox.y,
    })) as readonly CreationFlowElement[],
  };

  let next = removeElement(document, groupId);
  for (const member of members) {
    next = removeElement(next, member.id as ElementId);
  }
  next = addElement(
    next,
    { pageId, surfaceId },
    {
      ...group,
      rotation: group.rotation ?? 0,
      opacity: group.opacity ?? 1,
    },
  );
  return { document: next, groupId };
}

export function ungroupElement(
  document: CreationFlowDocument,
  groupId: ElementId,
): UngroupElementResult | undefined {
  const context = findElementSurface(document, groupId);
  if (!context) return undefined;
  const flatten = flattenSurfaceElements(context.surface);
  const group = flatten.find((el) => el.id === groupId);
  if (!group || group.type !== "group") return undefined;

  const surfaceMaxZ = flatten
    .filter((el) => el.id !== groupId)
    .reduce((acc, el) => Math.max(acc, getElementZIndex(el)), 0);

  let next = removeElement(document, groupId);
  const outIds: ElementId[] = [];

  for (let index = 0; index < group.children.length; index += 1) {
    const child = group.children[index];
    const restored = {
      ...child,
      x: group.x + child.x,
      y: group.y + child.y,
      zIndex: surfaceMaxZ + 1 + index,
    } as Parameters<typeof addElement>[2];
    next = addElement(next, { pageId: context.pageId, surfaceId: context.surface.id }, restored);
    outIds.push(restored.id as ElementId);
  }
  return { document: next, elementIds: outIds };
}
