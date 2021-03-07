import { TreeHandler, TreeVisitor } from "./visitor";

function walkObject<T>(cur: T, id: string, handler: TreeHandler<T>) {
  handler({ type: "node", id: id, node: cur });
  const entries = [...Object.entries(cur)];
  const children: string[] = [];
  for (const [key, child] of entries) {
    const childId = `${id}.${key}`;
    handler({ type: "parent", id: childId, parent: id });
    walkObject(child, childId, handler);
    children.push(childId);
  }
  handler({ type: "children", id: id, children: children });
}

export class ObjectVisitor<T extends {}> implements TreeVisitor<T> {
  constructor(protected rootNode: T, protected rootName: string = "$") {}
  get root(): string {
    return this.rootName;
  }
  walk(handler: TreeHandler<T>): Promise<void> {
    return Promise.resolve(walkObject(this.rootNode, this.rootName, handler));
  }
}
