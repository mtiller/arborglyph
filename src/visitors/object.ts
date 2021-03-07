import { isObject } from "../util";
import { TreeHandler, TreeVisitor } from "./visitor";

export type Namer = (parent: string, child: string) => string;

function walkObject<T>(
  cur: T,
  id: string,
  handler: TreeHandler<T>,
  visited: Set<T>,
  namer: Namer
) {
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);
  handler({ type: "node", id: id, node: cur });

  const children: string[] = [];
  if (isObject(cur)) {
    const entries = [...Object.entries(cur)];
    for (const [key, child] of entries) {
      const childId = namer(id, key);
      handler({ type: "parent", id: childId, parent: id });
      walkObject(child, childId, handler, new Set([...visited, cur]), namer);
      children.push(childId);
    }
  } else if (Array.isArray(cur)) {
    for (let i = 0; i < cur.length; i++) {
      const child = cur[i];
      const childId = namer(id, i.toString());
      handler({ type: "parent", id: childId, parent: id });
      walkObject(child, childId, handler, new Set([...visited, cur]), namer);
      children.push(childId);
    }
  } else {
    // If we get here, this is a leaf node, so there are no children to add.
  }
  handler({ type: "children", id: id, children: children });
}

export class ObjectVisitor implements TreeVisitor<any> {
  constructor(
    protected rootNode: {},
    protected namer: Namer = (parent, child) => `${parent}.${child}`,
    protected rootName: string = "$"
  ) {}
  get root(): string {
    return this.rootName;
  }
  walk(handler: TreeHandler<any>): Promise<void> {
    return Promise.resolve(
      walkObject(this.rootNode, this.rootName, handler, new Set(), this.namer)
    );
  }
}
