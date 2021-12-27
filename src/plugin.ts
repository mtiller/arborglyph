import { Arbor } from "./arbor";
import { ReificationOptions } from "./kinds/options";

export interface ArborPlugin<T extends object> {
  connect?(arbor: Arbor<T>): void;
  reificationOptions?(
    cur: Partial<ReificationOptions>
  ): Partial<ReificationOptions>;
}
