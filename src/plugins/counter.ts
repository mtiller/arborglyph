import { Arbor } from "../arbor";
import { Attribute } from "../kinds/attributes";
import { AttributeDefinition } from "../kinds/definitions";
import { ArborPlugin } from "../plugin";
import { CounterStatistics } from "./debug";

export class CounterPlugin<T extends object>
  implements ArborPlugin<T>, CounterStatistics<T>
{
  protected invocationMap: Map<Function, number> = new Map();
  protected nodeInvocationMap: Map<Function, WeakMap<T, number>> = new Map();
  protected evaluationMap: Map<Attribute<T, any>, number> = new Map();
  protected nodeEvaluationMap: Map<Attribute<T, any>, WeakMap<T, number>> =
    new Map();
  connect(arbor: Arbor<T>) {
    arbor.monitor.on("invocation", (a, n) => {
      this.recordInvocation(a, n);
    });
    arbor.monitor.on("evaluation", (d, n) => {
      this.recordEvaluation(d, n);
    });
  }
  protected recordInvocation(d: AttributeDefinition<T, any>, n: T): void {
    this.invocationMap.set(d.f, (this.invocationMap.get(d.f) ?? 0) + 1);
    const tallies = this.nodeInvocationMap.get(d.f) ?? new WeakMap();
    tallies.set(n, (tallies.get(n) ?? 0) + 1);
    this.nodeInvocationMap.set(d.f, tallies);
  }
  protected recordEvaluation(a: Attribute<T, any>, n: T): void {
    this.evaluationMap.set(a, (this.evaluationMap.get(a) ?? 0) + 1);
    const tallies = this.nodeEvaluationMap.get(a) ?? new WeakMap();
    tallies.set(n, (tallies.get(n) ?? 0) + 1);
    this.nodeEvaluationMap.set(a, tallies);
  }
  invocations(d: AttributeDefinition<T, any>, n?: T): number {
    if (n === undefined) return this.invocationMap.get(d.f) ?? 0;
    const tallies = this.nodeInvocationMap.get(d.f) ?? new WeakMap();
    return tallies.get(n) ?? 0;
  }
  evaluations(d: Attribute<T, any>, n?: T): number {
    if (n === undefined) return this.evaluationMap.get(d) ?? 0;
    const tallies = this.nodeEvaluationMap.get(d) ?? new WeakMap();
    return tallies.get(n) ?? 0;
  }
}
