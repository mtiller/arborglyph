import { PureMap } from "../maps/puremap";
import { Attribute } from "./attributes";

/**
 * This function takes another function as an argument (a function which takes
 * only a single string argument) and returns an compatible function that
 * implements memoization behind the scenes.
 *
 * There is a flag here to make it easy to disable the memoization.
 *
 * @param f
 * @param memoize
 * @returns
 */
export function memoizeEvaluator<R>(
  f: (x: string) => R,
  memoize: boolean = true
): Attribute<R> {
  if (!memoize) {
    const ret = function (x: string): R {
      return f(x);
    };
    ret.invalidate = () => undefined;
    return ret;
  } else {
    const map = new PureMap<string, R>();
    const ret = function (x: string): R {
      return map.getMaybe(x).orDefaultLazy(() => map.setRet(x, f(x)));
    };
    ret.invalidate = () => map.clear();
    return ret;
  }
}
