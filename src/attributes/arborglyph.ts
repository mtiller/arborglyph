import { TreeMap } from "../maps/treemap";
import { AddAttribute, AttributeTypes, DefinedAttributes } from "./attributes";
import {
  eagerSyntheticAttribute,
  SyntheticFunction,
  SyntheticOptions,
} from "./synthetic";

export class ArborGlyph<T, A extends AttributeTypes> {
  constructor(
    protected map: TreeMap<T>,
    protected attrs: DefinedAttributes<A> = {} as any
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
  ): ArborGlyphPlusSynthetic<T, A, N, R> {
    const attr = eagerSyntheticAttribute<T, A, R, CV>(f, this.map, this.attrs);
    const attrs: ArborGlyphPlusSynthetic<T, A, N, R>["attrs"] = {
      ...this.attrs,
      [name]: attr,
    };
    return new ArborGlyph(this.map, attrs);
  }
  get keys(): Set<keyof A> {
    return new Set(Object.keys(this.attrs));
  }
  query<N extends keyof A>(attr: N, nid: string): A[N] {
    return this.attrs[attr](nid);
  }
}

/**
 * This is basically the type of an `ArborGlyph` after it has had an attribute
 * named `N` that is evaluated with `F` added to it.
 */
export type ArborGlyphPlusSynthetic<
  T,
  A extends AttributeTypes,
  N extends string,
  R
> = ArborGlyph<T, AddAttribute<T, A, N, R>>;
