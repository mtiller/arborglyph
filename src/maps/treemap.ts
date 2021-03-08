import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { PureMap } from "./puremap";
import { TreeVisitor } from "../visitors/visitor";

export class TreeMap<T> {
  static async create<T>(visitor: TreeVisitor<T>): Promise<TreeMap<T>> {
    const ret = new TreeMap<T>(visitor);
    await ret.populate();
    return ret;
  }

  protected parentMap = new PureMap<string, string>();
  protected childMap = new PureMap<string, string[]>();
  protected nodeMap = new PureMap<string, T>();
  protected constructor(protected visitor: TreeVisitor<T>) {}
  protected populate(): Promise<void> {
    return this.visitor.walk((event) => {
      switch (event.type) {
        case "parent": {
          this.parentMap.setFirst(event.id, event.parent);
          break;
        }
        case "node": {
          this.nodeMap.setFirst(event.id, event.node);
          break;
        }
        case "children": {
          this.childMap.setFirst(event.id, event.children);
          break;
        }
      }
    });
  }
  get ids() {
    return this.nodeMap.keys();
  }
  get root() {
    return this.visitor.root;
  }
  parentNode(n: string): Maybe<T> {
    return this.parent(n).map((p) => this.node(p));
  }
  parent(n: string): Maybe<string> {
    if (n === this.visitor.root) return Nothing;
    return Just(
      this.parentMap.mustGet(
        n,
        new Error(`Node ${n} does not exist in this tree`)
      )
    );
  }
  children(n: string): string[] {
    return this.childMap.mustGet(
      n,
      new Error(`Node ${n} does not exist in this tree`)
    );
  }
  node(n: string): T {
    return this.nodeMap.mustGet(
      n,
      new Error(`Node ${n} does not exist in this tree`)
    );
  }
}
