import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";

export interface Attribute<R> {
  (nid: string): R;
}

/**
 * We deliberately don't include the values of children or parents here
 * because this would encourage traversal of the tree and interferes
 * without our knowing (restricting) how things are computed.
 */
export type SyntheticAttribute<T, A extends Attributes<any>, R> = (
  childValues: R[],
  childIds: string[],
  attrs: A,
  node: T,
  nid: string
) => R;
export type InheritedAttribute<T, A extends Attributes<any>, R> = (
  parentValue: Maybe<R>,
  attrs: A,
  node: T,
  nid: string
) => R;

export type AttributeFunction<T, A extends Attributes<any>, R> =
  | SyntheticAttribute<T, A, R>
  | InheritedAttribute<T, A, R>;

export type ResultingAttribute<F> = F extends AttributeFunction<
  any,
  any,
  infer R
>
  ? Attribute<R>
  : undefined;

export type AttributeFunctions<T> = {
  [key: string]: AttributeFunction<T, any, any>;
};

export type NodeType<F> = F extends AttributeFunctions<infer T> ? T : undefined;

export type MergeFunctions<
  T,
  A extends AttributeFunctions<T>,
  N extends string,
  F extends AttributeFunction<T, Attributes<A>, any>
> = A & Record<N, F>;

export type Attributes<F extends AttributeFunctions<any>> = {
  // These are the "builtin" attributes
  // parent: Attribute<string>;
} & {
  [K in keyof F]: ResultingAttribute<F[K]>;
};

export function noAttrs<T>(): AttributeFunctions<T> {
  return {};
}

export class ArborGlyph<T, A extends AttributeFunctions<T>> {
  constructor(protected map: TreeMap<T>, protected attrs: A = {} as any) {}
  synthetic<N extends string, R>(
    name: N,
    f: SyntheticAttribute<T, Attributes<A>, R>
  ): ArborGlyph<T, MergeFunctions<T, A, N, typeof f>> {
    const newA: MergeFunctions<T, A, N, typeof f> = {
      ...this.attrs,
      [name]: f,
    };
    return new ArborGlyph(this.map, newA);
  }
  get keys(): Set<keyof A> {
    return new Set(Object.keys(this.attrs));
  }
  eval<N extends keyof A>(attr: N, nid: string): A[N] {
    throw new Error(`Unimplemented`);
  }
}
