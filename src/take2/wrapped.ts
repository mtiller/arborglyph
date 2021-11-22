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
import { TreeType } from "./treetypes";

/** A potentially convenient class, not sure what I think about it yet. */
export class WrappedTree<T extends object> {
  constructor(public tree: TreeType<T>) {}
  inh<R>(f: InheritedAttributeEvaluator<T, R>, opts: InheritedOptions<T> = {}) {
    return reifyInheritedAttribute<T, R>(this.tree, f, opts);
  }
  syn<R>(f: SyntheticAttributeEvaluator<T, R>, opts: SyntheticOptions<T> = {}) {
    return reifySyntheticAttribute<T, R>(this.tree, f, opts);
  }
}
