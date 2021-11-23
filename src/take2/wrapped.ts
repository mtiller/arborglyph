import {
  InheritedAttributeEvaluator,
  InheritedOptions,
  reifyInheritedAttribute,
} from "./inherited";
import {
  reifySyntheticAttribute,
  SyntheticAttributeEvaluator,
  SyntheticOptions,
} from "./synthetic";
import { ListChildren } from "./treetypes";

/** A potentially convenient class, not sure what I think about it yet. */
export class WrappedTree<T extends object> {
  constructor(public root: T, public list: ListChildren<T>) {}
  inh<R>(
    f: InheritedAttributeEvaluator<T, R>,
    opts: InheritedOptions<T, R> = {}
  ) {
    return reifyInheritedAttribute<T, R>(this.root, this.list, f, opts);
  }
  syn<R>(
    f: SyntheticAttributeEvaluator<T, R>,
    opts: SyntheticOptions<T, R> = {}
  ) {
    return reifySyntheticAttribute<T, R>(this.root, this.list, f, opts);
  }
}
