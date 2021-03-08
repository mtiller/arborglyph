import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";
import { memoizeEvaluator } from "./memoize";

export interface InheritedArgs<T, A extends AttributeTypes, R> {
  parentValue: Maybe<R>;
  parentId: Maybe<string>;
  attrs: DefinedAttributes<A>;
  node: T;
  nid: string;
}

export type InheritedFunction<T, A extends AttributeTypes, R> = (
  args: InheritedArgs<T, A, R>
) => R;

export interface InheritedOptions {
  memoize?: boolean;
}

export function eagerInheritedAttribute<T, A, R>(
  evaluate: InheritedFunction<T, A, R>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<A>,
  memoize: boolean
): Attribute<R> {
  const ret = memoizeEvaluator((nid: string): R => {
    const node = map.node(nid);
    const parentId = map.parent(nid);
    const parentValue = parentId.map((_) => ret(_));
    return evaluate({ parentValue, parentId, attrs, node, nid });
  }, memoize);
  return ret;
}
