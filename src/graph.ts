import { VNode, ComputedRef } from "vue";
export const IMAGE_SIZE = 256;

export interface Vec2 {
  x: number;
  y: number;
}

export interface GraphNode {
  kind: number;
  name: string;
  pos: Vec2;
  minWidth: number | null;
  state: any | null;
}

export interface NodeData {
  inputs: Array<ComputedRef<DotKind>>;
  outputs: Array<ComputedRef<DotValue | null>>;
  preview(): VNode | null;
}

// export interface OutputData {
//   kind: ComputedRef<DotKind>;
//   value: ComputedRef<DotValue>;
// }

export type Rgba = [number, number, number, number];
export type Vec3 = [number, number, number];

export interface NodeCtx<S = any> {
  getInput(input: number): DotValue | null;
  state(): S | null;
  setState(value: S | null): void;
}

export interface PreviewCtx<S = any> extends NodeCtx<S> {
  getOutput(output: number): DotValue | null;
}

export interface NodeKind<S = any> {
  name: string;
  inputs: NodeInput[];
  outputs: Array<NodeOutput<S>>;
  preview?: (ctx: PreviewCtx<S>) => VNode | null;
}

export interface Transform {
  translateX: number;
  translateY: number;
  scale: number;
}

export function transformPoint(t: Transform, p: Vec2): Vec2 {
  return {
    x: (t.translateX + p.x) * t.scale,
    y: (t.translateY + p.y) * t.scale,
  };
}

export function uiToWorld(
  size: { w: number; h: number },
  t: Transform,
  p: Vec2
): Vec2 {
  return transformPoint(t, {
    x: p.x - size.w / 2,
    y: p.y - size.h / 2,
  });
}

export interface VisualGraph {
  nodes: Map<number, GraphNode>;
  links: Map<number, number>;
}

export type ComputedLinks = ComputedLink[];

export interface ComputedLink {
  start: Vec2;
  end: Vec2;
}

export interface GraphLink {
  startNode: number;
  startOutput: number;
  endNode: number;
  endInput: number;
}

export interface NodeInput {
  id: number;
  label: string;
  kind: DotKind;
}

export interface NodeOutput<S = any> {
  id: number;
  label: string;
  run(ctx: NodeCtx<S>): DotValue | null;
}

export const enum DotKind {
  NUMBER = 1,
  VECTOR = 2,
  COLOR = 4,
  IMAGE = 8,
  ANY = 15,
}

export interface DotValueColor {
  kind: DotKind.COLOR;
  value: Rgba;
}

export interface DotValueNumber {
  kind: DotKind.NUMBER;
  value: number;
}

export interface DotValueVector {
  kind: DotKind.VECTOR;
  value: Vec3;
}

export interface DotValueImage {
  kind: DotKind.IMAGE;
  value: Float32Array;
}

export type DotValue =
  | DotValueColor
  | DotValueNumber
  | DotValueImage
  | DotValueVector;

const INPUT_MASK = 0x40000000;

export function encodeDotId(node: number, dot: number, input: boolean): number {
  node = node | 0;
  dot = dot | 0;
  if (node < 0 || dot < 0 || node > 0x8fffff || dot > 0xff) {
    throw new Error("dot or node id out of bounds");
  }

  return ((node & 0x3fffff) << 8) | (dot & 0xff) | (input ? INPUT_MASK : 0);
}

export function link(
  nodeA: number,
  output: number,
  nodeB: number,
  input: number
): [number, number] {
  return [encodeDotId(nodeB, input, true), encodeDotId(nodeA, output, false)];
}

export function decodeDotId(encoded: number) {
  const dot = encoded & 0xff;
  const node = (encoded >> 8) & 0x3fffff;
  const input = (encoded & INPUT_MASK) == INPUT_MASK;
  return { dot, node, input };
}

(window as any)["encodeDotId"] = encodeDotId;
(window as any)["decodeDotId"] = decodeDotId;
