import { Attribute } from "../kinds/attributes";
import { AttributeDefinition, AttributeEvaluator } from "../kinds/definitions";
import { ArborPlugin } from "../plugin";

// export function counter<T, R>(
//   d: AttributeDefinition<T, R>,
//   map?: Map<AttributeDefinition<T, R>, number>
// ): AttributeDefinition<T, R> & { count: number } {
//   let count = 0;
//   const w: any = (x: any) => {
//     count++;
//     map?.set(d, count);
//     return d.f(x);
//   };
//   return {
//     ...d,
//     f: w,
//     get count() {
//       return count;
//     },
//   };
// }

export interface CounterStatistics<T> {
  invocations: (d: AttributeDefinition<T, any>, n?: T) => number;
  evaluations: (a: Attribute<T, any>, n?: T) => number;
}

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

// export function counterPlugin<T>(counts: Map<any, number>): ArborPlugin<T> {
//   return {
//     remapRoot: (root: any): any => {
//       return root;
//     },
//     remapDef: <R>(
//       attr: AttributeDefinition<any, R>
//     ): AttributeDefinition<any, R> => {
//       counts.set(attr, 0);
//       const w: any = (x: any) => {
//         let count = counts.get(attr) ?? 0;
//         count++;
//         counts.set(attr, count);
//         return attr.f(x);
//       };
//       return {
//         ...attr,
//         f: w,
//       };
//     },
//     remapAttr: <R>(attr: Attribute<T, R>) => {
//       const ret = (x: T) => {
//         let count = counts.get(ret) ?? 0;
//         count++;
//         counts.set(ret, count);
//         return attr(x);
//       };
//       counts.set(attr, 0);
//       return ret;
//     },
//     recordInvocation: (e: AttributeEvaluator<T, any>, n) => {
//       counts.set(e, (counts.get(e) ?? 0) + 1);
//     },
//   };
// }
