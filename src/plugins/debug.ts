import { Attribute } from "../kinds/attributes";
import { AttributeDefinition } from "../kinds/definitions";
import { ArborPlugin } from "../plugin";

export interface CounterStatistics<T> {
  invocations: (d: AttributeDefinition<T, any>, n?: T) => number;
  evaluations: (a: Attribute<T, any>, n?: T) => number;
}

// TODO: Add some predicates to control when reporting happens
export class DebugPlugin<T extends object> implements ArborPlugin<T> {
  public events: string[] = [];
  constructor(
    public stringifyNode: (node: T) => string = (node: T) =>
      JSON.stringify(node),
    public stringifyResult: (result: any) => string = (result: any) =>
      JSON.stringify(result)
  ) {}
  recordInvocation?<R>(d: AttributeDefinition<T, R>, n: T, r: R): void {
    const msg = `${d.description}(${this.stringifyNode(
      n
    )}) => ${this.stringifyResult(r)}`;
    this.events.push(msg);
    console.log(msg);
  }
}
