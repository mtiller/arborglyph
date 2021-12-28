import { Arbor } from "./arbor";
import { ReificationOptions } from "./kinds/options";

/** Definition for Arbor plugins */
export interface ArborPlugin<T extends object> {
  /**
   * This function is called when the plugin is associated with a particular `Arbor` instance.
   * This is primarily to allow the plugin to subscribe to events.
   **/
  connect?(arbor: Arbor<T>): void;
  /** This function allows the plugin to modify the applied overrides for reification options. */
  reificationOptions?(
    cur: Partial<ReificationOptions>
  ): Partial<ReificationOptions>;
}
