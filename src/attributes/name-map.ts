import { Maybe } from "purify-ts/Maybe";
import { SyntheticAttributeEvaluator } from "..";
import { ScalarFunction } from "../kinds/attributes";
import { synthetic } from "../kinds/definitions";

export function symbolTableEvaluator<T>(
  namer: ScalarFunction<T, string | Maybe<string>>
): SyntheticAttributeEvaluator<T, Map<string, T>> {
  return ({ node, children }) => {
    const ret = children.reduce((p, c) => {
      c.attr.forEach((v, k) => p.set(k, v));
      return p;
    }, new Map<string, T>());
    const me = namer(node);
    if (typeof me === "string") ret.set(me, node);
    if (Maybe.isMaybe(me)) me.ifJust((x) => ret.set(x, node));
    return ret;
  };
}

// Better as two pass, one give names to everything
// Second collect names from matching.
function condSymbolTableEvaluator<T, S extends T>(
  namer: ScalarFunction<S, string>,
  pred: (x: T) => x is S
): SyntheticAttributeEvaluator<T, Map<string, S>> {
  return ({ node, children }) => {
    const ret = children.reduce((p, c) => {
      c.attr.forEach((v, k) => p.set(k, v));
      return p;
    }, new Map<string, S>());
    if (pred(node)) {
      const me = namer(node);
      ret.set(me, node);
    }
    return ret;
  };
}

export interface SubTableOptions {
  name?: string;
}
/** Provides a symbol table for a subset of nodes */
export function subTable<T, S extends T>(
  namer: ScalarFunction<S, string>,
  pred: (x: T) => x is S,
  opts?: SubTableOptions
) {
  return synthetic(
    opts?.name ?? "symbol table",
    condSymbolTableEvaluator(namer, pred)
  );
}

// TODO: Conditional name map
