import { PureWeakMap } from "../maps/puremap";
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
export function memoizeEvaluator<T extends object, R>(
  f: (x: T) => R,
  memoize: boolean = true
): Attribute<T, R> {
  if (!memoize) {
    const ret = function (x: T): R {
      return f(x);
    };
    return ret;
  } else {
    const map = new PureWeakMap<T, R>();
    const ret = function (x: T): R {
      return map.getMaybe(x).orDefaultLazy(() => map.setRet(x, f(x)));
    };
    return ret;
  }
}
