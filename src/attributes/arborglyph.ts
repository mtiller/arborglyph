import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";

export interface Attribute<R> {
  (nid: string): R;
}

export interface SyntheticAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "synthetic";
  evaluate: (
    childValues: R[],
    childIds: string[],
    attrs: A,
    node: T,
    nid: string
  ) => R;
  options: {};
}

export interface InheritedAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "inherited";
  evlauate: (
    childValues: R[],
    childIds: string[],
    attrs: A,
    node: T,
    nid: string
  ) => R;
  options: {};
}

export interface NodeAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "node";
  evlauate: (node: T, attrs: A, nid: string) => R;
  options: {};
}

export type AttributeDefinition<T, A extends Attributes<any>, R> =
  | SyntheticAttributeDefinition<T, A, R>
  | InheritedAttributeDefinition<T, A, R>
  | NodeAttributeDefinition<T, A, R>;

export type AttributeType<F> = F extends AttributeDefinition<any, any, infer R>
  ? R
  : undefined;

export type AttributeDefinitions<T> = {
  [key: string]: AttributeDefinition<T, any, any>;
};

export type NodeType<F> = F extends AttributeDefinitions<infer T>
  ? T
  : undefined;

export type Merge<A1, A2> = {
  [P in keyof A1]: A1[P];
} &
  {
    [N in keyof A2]: A2[N];
  };

export type MergeFunctions<
  T,
  A extends AttributeDefinitions<T>,
  N extends string,
  F extends AttributeDefinition<T, Attributes<A>, any>
> = { [P in keyof A]: A[P] } & { [P in N]: F };

export type Attributes<F extends AttributeDefinitions<any>> = {
  // These are the "builtin" attributes
  // parent: Attribute<string>;
} & {
  [K in keyof F]: Attribute<AttributeType<F[K]>>;
};

export function noAttrs<T>(): AttributeDefinitions<T> {
  return {};
}

export class ArborGlyph<T, A extends AttributeDefinitions<T>> {
  constructor(protected map: TreeMap<T>, protected attrs: A = {} as any) {}
  synthetic<N extends string, R>(
    name: N,
    f: SyntheticAttributeDefinition<T, Attributes<A>, R>["evaluate"],
    options: SyntheticAttributeDefinition<T, Attributes<A>, R>["options"] = {}
  ): ArborGlyph<
    T,
    MergeFunctions<T, A, N, SyntheticAttributeDefinition<T, Attributes<A>, R>>
  > {
    const newA: MergeFunctions<
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
  get keys(): Set<keyof A> {
    return new Set(Object.keys(this.attrs));
  }
  eval<N extends keyof A>(attr: N, nid: string): A[N] {
    throw new Error(`Unimplemented`);
  }
}
