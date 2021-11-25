import { AttributeDefinition } from "../kinds/definitions";

export function counter<T, R>(
  d: AttributeDefinition<T, R>
): AttributeDefinition<T, R> & { count: number } {
  let count = 0;
  const w: any = (x: any) => {
    count++;
    return d.f(x);
  };
  return {
    ...d,
    f: w,
    get count() {
      return count;
    },
  };
}
