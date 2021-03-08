import { TreeMap } from "../maps/treemap";
import {
  AddAttribute,
  AttributeDefinition,
  AttributeDefinitions,
  AttributeTypeFromDefinition,
  AttributeTypesFromDefinitions,
} from "./attributes";
import {
  eagerSyntheticAttribute,
  SyntheticAttributeDefinition,
  SyntheticDefintionFromEval,
  SyntheticFunction,
  SyntheticOptions,
} from "./synthetic";

export class ArborGlyph<T, A extends AttributeDefinitions<T>> {
  constructor(protected map: TreeMap<T>, protected attrs: A = {} as any) {}
  /**
   * Note, for type inferencing to work here, the first argument of the synthetic
   * evaluation function must be typed.  Normally, the TypeScript compiler
   * could infer the type `R` from the return type of the synthetic function evaluator.
   * But because the first argument also involved `R`, it falls back to `unknown`.
   * @param name
   * @param f
   * @param options
   * @returns
   */
  synthetic<R, N extends string, CV extends R = R>(
    name: N,
    f: SyntheticFunction<T, AttributeTypesFromDefinitions<A>, R, CV>,
    options: SyntheticOptions = {}
  ): ArborGlyphPlusSynthetic<T, A, N, typeof f> {
    const newA: ArborGlyphPlusSynthetic<T, A, N, typeof f>["attrs"] = {
      ...this.attrs,
      [name]: { type: "synthetic", evaluate: f, options: options },
    };
    return new ArborGlyph(this.map, newA);
  }
  get keys(): Set<keyof A> {
    return new Set(Object.keys(this.attrs));
  }
  query<N extends keyof A>(
    attr: N,
    nid: string
  ): AttributeTypeFromDefinition<N, A> {
    const def: AttributeDefinition<
      T,
      AttributeTypesFromDefinitions<A>,
      AttributeTypeFromDefinition<N, A>,
      any
    > = this.attrs[attr];
    if (def === undefined)
      throw new Error(`No attribute named '${attr}' found on tree`);
    switch (def.type) {
      case "synthetic": {
        const attr = eagerSyntheticAttribute(def, this.map);
        const result = attr(nid);
        console.log("Query = ", result);
        return result;
      }
    }
    throw new Error(`Unimplemented`);
  }
}

/**
 * This is basically the type of an `ArborGlyph` after it has had an attribute
 * named `N` that is evaluated with `F` added to it.
 */
export type ArborGlyphPlusSynthetic<
  T,
  A extends AttributeDefinitions<T>,
  N extends string,
  F extends SyntheticFunction<T, AttributeTypesFromDefinitions<A>, any, any>
> = ArborGlyph<T, AddAttribute<T, A, N, SyntheticDefintionFromEval<F>>>;
