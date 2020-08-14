import { VNode } from "vue";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GraphNode {
  id: number;
  kind: number;
  name: string;
  pos: Vec2;
  minWidth: number | null;
  state: any | null;
}

type Rgba = [number, number, number, number];

interface NodeCtx {
  getInput(input: number): DotValue | null;
  state(): any | null;
}

interface PreviewCtx extends NodeCtx {
  getOutut(output: number): DotValue | null;
}

export interface NodeKind {
  id: number;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  preview: ((ctx: NodeCtx) => VNode) | null;
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

export interface VisualGraph {
  kinds: NodeKind[];
  nodes: GraphNode[];
  links: GraphLink[];
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

export interface NodeOutput {
  id: number;
  label: string;
  run(ctx: NodeCtx): DotValue | null;
}

export const enum DotKind {
  NUMBER = 1,
  COLOR = 2,
  IMAGE = 4,
  ANY = 7,
}

interface DotValueColor {
  kind: DotKind.COLOR;
  value: Rgba;
}

interface DotValueNumber {
  kind: DotKind.NUMBER;
  value: number;
}

interface DotValueImage {
  kind: DotKind.IMAGE;
  value: Uint8Array;
}

type DotValue = DotValueColor | DotValueNumber | DotValueImage;
