import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { TreeType } from "./treetypes";

export type ScalarFunction<T, R> = (x: T) => R;
export type ParentFunc<T> = (x: T) => Maybe<T>;
export type OptionalParentFunc<T> = null | ParentFunc<T>;
export type InheritedAttribute<T, R> = (args: InheritedArgs<T, R>) => R;

export interface ParentInformation<T, R> {
  node: T;
  attr: () => R;
}

export interface InheritedArgs<T, R> {
  parent: Maybe<ParentInformation<T, R>>;
  node: T;
}

export class NodeNotFoundError<T> extends Error {
  constructor(public n: T, public tree: TreeType<T>) {
    super("Unable to find node in tree");
  }
}

function parentInformation<T, R>(
  x: T,
  pf: ParentFunc<T>,
  f: InheritedAttribute<T, R>
): Maybe<ParentInformation<T, R>> {
  const possibleParent = pf(x);
  return possibleParent.map((parent) => {
    const attr = (): R => {
      const info = parentInformation(parent, pf, f);
      return f({ parent: info, node: x });
    };
    return { node: x, attr: attr };
  });
}

export function reifyInheritedAttribute<T, R>(
  tree: TreeType<T>,
  f: InheritedAttribute<T, R>,
  p: OptionalParentFunc<T> = null
): ScalarFunction<T, R> {
  /** This is a function that may call itself recursively */
  const ev = (
    x: T,
    cur: T,
    parent: Maybe<ParentInformation<T, R>>
  ): Maybe<R> => {
    const attr = () => f({ node: cur, parent: parent });
    if (x === cur) {
      return Just(attr());
    }

    /** Next consider all children of the root */
    const children = tree.children(cur);

    const information: ParentInformation<T, R> = {
      node: cur,
      attr: attr,
    };
    if (Array.isArray(children)) {
      /** If this is an indexed tree... */
      for (const child of children) {
        const result = ev(x, child, Just(information));
        const y: Maybe<R> = result;
        if (result.isJust()) {
          return y;
        }
      }
    } else {
      /** If this tree has named children */
      for (const child of Object.entries(children)) {
        const result = ev(x, child[1], Just(information));
        const y: Maybe<R> = result;
        if (result.isJust()) {
          return y;
        }
      }
    }
    return Nothing;
  };

  return (x: T): R => {
    /**
     * If a parent function was supplied, then this is very easy
     */
    if (p) {
      const information = parentInformation(x, p, f);
      return f({ node: x, parent: information });
    }

    /**
     * Otherwise (e.g., if the inherited attribute is meant to compute parents), then this is
     * a bit tricker
     **/
    const search = ev(x, tree.root, Nothing);
    return search.caseOf({
      Nothing: () => {
        throw new NodeNotFoundError<T>(x, tree);
      },
      Just: (x) => x,
    });
  };
}