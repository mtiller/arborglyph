import {
  InheritedAttributeEvaluator,
  reifyInheritedAttribute,
} from "./inherited";
import {
  reifySyntheticAttribute,
  SyntheticAttributeEvaluator,
} from "./synthetic";
import { TreeType } from "./treetypes";

/** A potentially convenient class, not sure what I think about it yet. */
export class WrappedTree<T extends object> {
  constructor(public tree: TreeType<T>) {}
  inh<R>(f: InheritedAttributeEvaluator<T, R>) {
    return reifyInheritedAttribute<T, R>(this.tree, f, {});
  }
  syn<R>(f: SyntheticAttributeEvaluator<T, R>) {
    return reifySyntheticAttribute<T, R>(this.tree, f, {});
  }
}
