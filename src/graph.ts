export interface Vec2 {
  x: number;
  y: number;
}

export interface GraphNode {
  id: number;
  name: string;
  pos: Vec2;
  inputs: NodeInput[];
  outputs: NodeOutput[];
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
  nodes: GraphNode[];
  links: GraphLink[];
}

export type ComputedLinks = ComputedLink[];

export interface ComputedLink {
  start: Vec2;
  end: Vec2;
}

export interface GraphLink {
  start: number;
  end: number;
}

export interface NodeInput {
  id: number;
  color: string;
  label: string;
}

export interface NodeOutput {
  id: number;
  color: string;
  label: string;
}
