import { Attribute } from "../kinds/attributes";
import { AttributeDefinition } from "../kinds/definitions";
import { SyntheticAttributeEvaluator } from "../kinds/synthetic";
import { ArborPlugin } from "../plugin";
import { assertUnreachable } from "../utils";
import { CounterStatistics } from "./debug";

export class CounterPlugin<T extends object>
  implements ArborPlugin<T>, CounterStatistics<T>
{
  protected invocationMap: Map<AttributeDefinition<T, any>, number> = new Map();
  protected nodeInvocationMap: Map<
    AttributeDefinition<T, any>,
    WeakMap<T, number>
  > = new Map();
  protected evaluationMap: Map<Attribute<T, any>, number> = new Map();
  protected nodeEvaluationMap: Map<Attribute<T, any>, WeakMap<T, number>> =
    new Map();
  wrap<R>(d: AttributeDefinition<T, R>): typeof d {
    switch (d.type) {
      case "syn": {
        const instrumentedFunction: SyntheticAttributeEvaluator<T, R> = (x) => {
          this.invocationMap.set(d, (this.invocationMap.get(d) ?? 0) + 1);
          const tallies = this.nodeInvocationMap.get(d) ?? new WeakMap();
          tallies.set(x.node, (tallies.get(x.node) ?? 0) + 1);
          this.nodeInvocationMap.set(d, tallies);
          return d.f(x);
        };
        return { ...d, f: instrumentedFunction };
      }
      case "inh": {
        return { ...d };
      }
      case "der": {
        return { ...d };
      }
      case "trans": {
        throw new Error("Unimplemented");
      }
    }
    return assertUnreachable(d);
  }
  recordInvocation?(d: AttributeDefinition<T, any>, n: T): void {
    this.invocationMap.set(d, (this.invocationMap.get(d) ?? 0) + 1);
    const tallies = this.nodeInvocationMap.get(d) ?? new WeakMap();
    tallies.set(n, (tallies.get(n) ?? 0) + 1);
    this.nodeInvocationMap.set(d, tallies);
  }
  recordEvaluation?(a: Attribute<T, any>, n: T): void {
    this.evaluationMap.set(a, (this.evaluationMap.get(a) ?? 0) + 1);
    const tallies = this.nodeEvaluationMap.get(a) ?? new WeakMap();
    tallies.set(n, (tallies.get(n) ?? 0) + 1);
    this.nodeEvaluationMap.set(a, tallies);
  }
  invocations(d: AttributeDefinition<T, any>, n?: T): number {
    if (n === undefined) return this.invocationMap.get(d) ?? 0;
    const tallies = this.nodeInvocationMap.get(d) ?? new WeakMap();
    return tallies.get(n) ?? 0;
  }
  evaluations(d: Attribute<T, any>, n?: T): number {
    if (n === undefined) return this.evaluationMap.get(d) ?? 0;
    const tallies = this.nodeEvaluationMap.get(d) ?? new WeakMap();
    return tallies.get(n) ?? 0;
  }
}
