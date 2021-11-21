import { Just, Maybe, Nothing } from "purify-ts/Maybe";
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
  root: boolean;
  parent: Maybe<T & A>;
  node: T & A;
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
export function inheritedAttribute<T extends object, A, R>(
  evaluate: InheritedFunction<T, A, R>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<T, A>,
  memoize: boolean
): Attribute<T, R> {
  const ret = memoizeEvaluator((node: T): R => {
    // We assume the nodes have all been annotated at this point
    const parent = map.parent(node);
    const root = parent.isNothing();
    return evaluate({
      root,
      parent: parent as Maybe<T & A>,
      node: node as T & A,
    });
  }, memoize);
  return ret;
}

export function inherited<
  N extends string,
  T extends object,
  D extends AttributeTypes,
  R
>(
  name: N,
  f: InheritedFunction<T, D, R>,
  memoize: boolean = false
): AttributeConstructor<N, T, D, R> {
  /**
   * The A parameter here represents some superset of D.  In other words,
   * this function can be pass a value for `ext` that has **more** attributes
   * than D (the set of attributes we require).  That's fine.  So the type of
   * the attributes actually passed in `A` which is some superset of `D`.  But
   * we need this type here to imply the constraint that what we return will
   * also contain `A` plus whatever attribute we are adding (and not just return
   * the requires set `D` plus what we are adding).
   */
  return <A extends D>(
    tree: TreeMap<T>,
    base: DefinedAttributes<T, D>,
    ext: DefinedAttributes<T, A>
  ): ExtendedBy<T, A, N, R> => {
    const attr = inheritedAttribute<T, D, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<T, A & Record<N, R>> = {
      ...ext,
      [name]: attr,
    };
    return attrs;
  };
}
