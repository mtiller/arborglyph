import { TreeMap } from "../maps/treemap";
import { AddAttribute, AttributeTypes, DefinedAttributes } from "./attributes";
import {
  eagerInheritedAttribute,
  InheritedFunction,
  InheritedOptions,
} from "./inherited";
import {
  eagerSyntheticAttribute,
  SyntheticFunction,
  SyntheticOptions,
} from "./synthetic";

export class ArborGlyph<T, A extends AttributeTypes> {
  constructor(
    protected map: TreeMap<T>,
    protected attributes: DefinedAttributes<A> = {} as any
  ) {}
  /**
   * Note, for type inferencing to work here, the first argument of the
   * synthetic evaluation function must be typed.  Normally, the TypeScript
   * compiler could infer the type `R` from the return type of the synthetic
   * function evaluator. But because the first argument also involved `R`, it
   * falls back to `unknown`.
   * @param name
   * @param f
   * @param options
   * @returns
   */
  synthetic<R, N extends string, CV extends R = R>(
    name: N,
    f: SyntheticFunction<T, A, R, CV>,
    options: SyntheticOptions = {}
  ): ArborGlyphPlusNewAttribute<T, A, N, R> {
    const attr = eagerSyntheticAttribute<T, A, R, CV>(
      f,
      this.map,
      this.attributes
    );
    const attrs: ArborGlyphPlusNewAttribute<T, A, N, R>["attributes"] = {
      ...this.attributes,
      [name]: attr,
    };
    return new ArborGlyph(this.map, attrs);
  }
  inherited<N extends string, R, PV extends R = R>(
    name: N,
    f: InheritedFunction<T, A, R, PV>,
    options: InheritedOptions = {}
  ): ArborGlyphPlusNewAttribute<T, A, N, R> {
    const attr = eagerInheritedAttribute<T, A, R, PV>(
      f,
      this.map,
      this.attributes
    );
    const attrs: ArborGlyphPlusNewAttribute<T, A, N, R>["attributes"] = {
      ...this.attributes,
      [name]: attr,
    };
    return new ArborGlyph(this.map, attrs);
  }
  get attrs(): Set<keyof A> {
    return new Set(Object.keys(this.attributes));
  }
  query<N extends keyof A>(attr: N, nid: string): A[N] {
    return this.attributes[attr](nid);
  }
  debug<N extends keyof A>(attr: N, cur = this.map.root, prefix: string = "") {
    const val = this.attributes[attr](cur);
    console.log(`${prefix}${cur}: ${JSON.stringify(val)}`);
    const subprefix = prefix + "  ";
    for (const child of this.map.children(cur)) {
      this.debug(attr, child, subprefix);
    }
  }
}

/**
 * This is basically the type of an `ArborGlyph` after it has had an attribute
 * named `N` that is evaluated with `F` added to it.
 */
export type ArborGlyphPlusNewAttribute<
  T,
  A extends AttributeTypes,
  N extends string,
  R
> = ArborGlyph<T, AddAttribute<T, A, N, R>>;
