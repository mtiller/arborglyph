import { TreeMap } from "../maps/treemap";
import { ArborGlyph } from "./arborglyph";
import {
  Attribute,
  AttributeConstructor,
  AttributeTypes,
  DefinedAttributes,
  ExtendedBy,
} from "./attributes";
import { memoizeEvaluator } from "./memoize";

/**
 * Arguments available when computing a derived attribute.
 */
export interface DerivedArgs<T, A extends AttributeTypes, R> {
  node: T & A;
}

/**
 * Type signature of the function that computes derived attributes.
 */
export type DerivedFunction<T, A extends AttributeTypes, R> = (
  args: DerivedArgs<T, A, R>
) => R;

/**
 * Options associated with computed derived attributes.
 */
export interface DerivedOptions {
  memoize?: boolean;
}

/**
 * This function creates an `Attribute` that returns the value of the derived
 * attribute.  It will invoke the provided `evaluate` function to do this, but
 * it will try to minimize the invocation of that function.
 *
 * This attribute is a degenerative case of both synthetic and inherited
 * attributes that don't depend on any other nodes except the target node
 * itself.  Using a derived attribute ensures that there are no inadvertent
 * evaluations of "neighboring" nodes.
 * @param evaluate
 * @param tree
 * @param attrs
 * @param memoize
 * @returns
 */
export function derivedAttribute<T extends object, A, R>(
  evaluate: DerivedFunction<T, A, R>,
  tree: TreeMap<T>,
  attrs: DefinedAttributes<T, A>,
  memoize: boolean
): Attribute<T, R> {
  const ret = memoizeEvaluator(
    (node: T): R => {
      // We assume the nodes have all been annotated at this point
      return evaluate({ node: node as T & A });
    }
  );
  return ret;
}

export function derived<
  N extends string,
  T extends object,
  D extends AttributeTypes,
  R
>(
  name: N,
  f: DerivedFunction<T, D, R>,
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
    const attr = derivedAttribute<T, D, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<T, A & Record<N, R>> = {
      ...ext,
      [name]: attr,
    };
    return attrs;
  };
}
