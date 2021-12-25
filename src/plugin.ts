import { CommonInheritedOptions, CommonSyntheticOptions } from ".";
import { Arbor } from "./arbor";

export interface ArborPlugin<T extends object> {
  connect?(arbor: Arbor<T>): void;
  inheritedOptions?(
    cur: Partial<CommonInheritedOptions>
  ): Partial<CommonInheritedOptions>;
  syntheticOptions?(
    cur: Partial<CommonSyntheticOptions>
  ): Partial<CommonSyntheticOptions>;
}
