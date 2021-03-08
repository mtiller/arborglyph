import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";
import { memoizeEvaluator } from "./memoize";

/**
 * Arguments available when computing a inherited attribute.
 */
export interface InheritedArgs<T, A extends AttributeTypes, R> {
  parentValue: Maybe<R>;
  parentId: Maybe<string>;
  attrs: DefinedAttributes<A>;
  node: T;
  nid: string;
}

/**
 * Type signature of the function that computes inherited attributes.
 */
export type InheritedFunction<T, A extends AttributeTypes, R> = (
  args: InheritedArgs<T, A, R>
) => R;

/**
 * Options associated with computed inherited attributes.
 */
export interface InheritedOptions {
  memoize?: boolean;
}

/**
 * This function creates an `Attribute` that returns the value of the inherited
 * attribute.  It will invoke the provided `evaluate` function to do this, but
 * it will try to minimize the invocation of that function.  It also manages
 * "walking the tree" to retrieve parent values.
 * @param evaluate
 * @param tree
 * @param attrs
 * @param memoize
 * @returns
 */
export function inheritedAttribute<T, A, R>(
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
