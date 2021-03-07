import { Maybe } from "purify-ts/Maybe";

export interface ParentEvent {
  type: "parent";
  id: string;
  parent: string;
}

export interface NodeEvent<T> {
  type: "node";
  id: string;
  node: T;
}

export interface ChildrenEvent {
  type: "children";
  id: string;
  children: string[];
}

export type TreeEvent<T> = ParentEvent | ChildrenEvent | NodeEvent<T>;
export type TreeHandler<T> = (event: TreeEvent<T>) => void;

export interface TreeVisitor<T> {
  root: string;
  walk(handler: TreeHandler<T>): Promise<void>;
}
