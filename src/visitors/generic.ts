import { Namer } from "./namer";
import { TreeHandler, TreeVisitor } from "./visitor";

export type NamedChildren<T> = (n: T) => { [key: string]: T };

function walkGeneric<T>(
  cur: T,
  id: string,
  handler: TreeHandler<T>,
  visited: Set<T>,
  getChildren: NamedChildren<T>,
  namer: Namer
) {
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);
  handler({ type: "node", id: id, node: cur });

  const children = Object.entries(getChildren(cur)).map(
    ([childName, child]) => ({
      childName,
      child,
      childId: namer(id, childName),
    })
  );

  for (const { child, childId } of children) {
    handler({ type: "parent", id: childId, parent: id });
    walkGeneric(
      child,
      childId,
      handler,
      new Set([...visited, cur]),
      getChildren,
      namer
    );
  }
  handler({
    type: "children",
    id: id,
    children: children.map((x) => x.childId),
  });
}

export class GenericVisitor<T> implements TreeVisitor<T> {
  constructor(
    protected rootNode: T,
    protected children: NamedChildren<T>,
    protected namer: Namer = (parent, child) => `${parent}.${child}`,
    protected rootName: string = "$"
  ) {}
  get root(): string {
    return this.rootName;
  }
  walk(handler: TreeHandler<any>): Promise<void> {
    return Promise.resolve(
      walkGeneric(
        this.rootNode,
        this.rootName,
        handler,
        new Set(),
        this.children,
        this.namer
      )
    );
  }
}
