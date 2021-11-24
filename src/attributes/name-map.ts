import { Maybe } from "purify-ts/Maybe";
import { SyntheticAttributeEvaluator } from "..";
import { ScalarFunction } from "../kinds/attributes";

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

// TODO: Conditional name map
