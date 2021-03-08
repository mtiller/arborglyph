import { TreeMap } from "../maps/treemap";
import { AddAttribute, AttributeDefinitions, Attributes } from "./attributes";
import { SyntheticAttributeDefinition, SyntheticFunction } from "./synthetic";

export type ComplexFunction<T, A, R> = (x: T, a: A) => R;

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
  synthetic<R, N extends string>(
    name: N,
    f: SyntheticFunction<T, Attributes<A>, R>,
    options: SyntheticAttributeDefinition<T, Attributes<A>, any>["options"] = {}
  ): ArborGlyph<
    T,
    AddAttribute<T, A, N, SyntheticAttributeDefinition<T, Attributes<A>, R>>
  > {
    const newA: AddAttribute<
      T,
      A,
      N,
      SyntheticAttributeDefinition<T, Attributes<A>, R>
    > = {
      ...this.attrs,
      [name]: { type: "synthetic", evaluate: f, options: options },
    };
    return new ArborGlyph(this.map, newA);
  }
  foo<N extends string, R>(
    n: N,
    f: SyntheticFunction<T, Attributes<A>, R>
  ): { y: R } {
    throw new Error(`Unimplemented`);
  }
  get keys(): Set<keyof A> {
    return new Set(Object.keys(this.attrs));
  }
  query<N extends keyof A>(attr: N, nid: string): A[N] {
    throw new Error(`Unimplemented`);
  }
}
