import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";
import {
  Attribute,
  AttributeConstructor,
  AttributeTypes,
  DefinedAttributes,
  ExtendedBy,
} from "./attributes";
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

export function inherited<N extends string, T, D extends AttributeTypes, R>(
  name: N,
  f: InheritedFunction<T, D, R>,
  memoize: boolean = false
): AttributeConstructor<N, T, D, R> {
  /**
   * The SA parameter here represents some superset of A.  In other words,
   * this function can be pass a value for `base` that has **more** attributes
   * than A (the set of attributes we require).  That's fine.  So the type of
   * the attributes actually passed in `SA` which is some superset of `A`.  But
   * we need this type here to imply the constraint that what we return will
   * also contain `SA` plus whatever attribute we are adding (and not just return
   * the requires set `A` plus what we are adding).
   */
  return <A extends D>(
    tree: TreeMap<T>,
    base: DefinedAttributes<D>,
    ext: DefinedAttributes<A>
  ): ExtendedBy<A, N, R> => {
    const attr = inheritedAttribute<T, D, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<A & Record<N, R>> = {
      ...ext,
      [name]: attr,
    };
    return attrs;
  };
}
