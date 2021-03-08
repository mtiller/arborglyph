import { PureMap } from "../maps/puremap";
import { Attribute } from "./attributes";

export function memoizeEvaluator<R>(
  f: (x: string) => R,
  memoize: boolean = true
): Attribute<R> {
  if (!memoize) {
    const ret = function (x: string): R {
      return f(x);
    };
    return ret;
  } else {
    const map = new PureMap<string, R>();
    const ret = function (x: string): R {
      return map.getMaybe(x).orDefaultLazy(() => map.setRet(x, f(x)));
    };
    return ret;
  }
}
