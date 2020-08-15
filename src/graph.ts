import { VNode, ComputedRef, computed } from "vue";

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
  outputs: Array<ComputedRef<DotValue | null>>;
  preview: ComputedRef<VNode | null>;
}

// export interface OutputData {
//   kind: ComputedRef<DotKind>;
//   value: ComputedRef<DotValue>;
// }

type Rgba = [number, number, number, number];

interface NodeCtx {
  getInput(input: number): DotValue | null;
  state(): any | null;
  setState(value: any): void;
}

interface PreviewCtx extends NodeCtx {
  getOutput(output: number): DotValue | null;
}

export interface NodeKind {
  id: number;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  preview: ((ctx: PreviewCtx) => VNode) | null;
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

interface OutputState {
  verifiedAt: number;
  changedAt: number;
  deps: string[];
  stateDep: boolean;
  value: DotValue;
}

const INPUT_MASK = 0x40000000;

export function encodeDotId(node: number, dot: number, input: boolean): number {
  node = node | 0;
  dot = dot | 0;
  if (node < 0 || dot < 0 || node > 0x8fffff || dot > 0xff) {
    throw new Error("dot or node id out of bounds");
  }

  return ((node & 0x3fffffff) << 8) | (dot & 0xff) | (input ? INPUT_MASK : 0);
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
  const node = (encoded >> 8) & 0x3fffffff;
  const input = (encoded & INPUT_MASK) == INPUT_MASK;
  return { dot, node, input };
}

export class EvalContext {
  graph: VisualGraph;
  data: Map<GraphNode, NodeData> = new Map();
  constructor(graph: VisualGraph) {
    this.graph = graph;
  }

  outputCache: Map<number, OutputState> = new Map();

  nodeData(nodeId: number): NodeData | null {
    const node = this.graph.nodes.get(nodeId);
    if (node == null) {
      return null;
    }
    let data = this.data.get(node);
    if (data == null) {
      const kind = this.graph.kinds[node.kind];
      const ctx = this.getCtx(nodeId);
      this.data.set(
        node,
        (data = {
          outputs: kind.outputs.map((output) =>
            computed(() => output.run(ctx))
          ),
          preview: computed(() =>
            kind.preview == null ? null : kind.preview(ctx)
          ),
        })
      );
    }
    return data;
  }

  getOutput(node: number, output: number): DotValue | null {
    const data = this.nodeData(node);
    const out = data?.outputs[output]?.value;
    return out == null ? null : out;
  }

  getCtx(node: number): PreviewCtx {
    return {
      getInput: (input): DotValue | null => {
        const iid = encodeDotId(node, input, true);
        const oid = this.graph.links.get(iid);
        if (oid == null) return null;
        const decoded = decodeDotId(oid);
        if (decoded.input == true) {
          return null;
        }
        return this.getOutput(decoded.node, decoded.dot);
      },
      state: () => {
        const state = this.graph.nodes.get(node)!.state;
        if (state == null) return null;
        return state;
      },
      setState: (value) => {
        this.graph.nodes.get(node)!.state = value;
      },
      getOutput: (output) => this.getOutput(node, output),
    };
  }
}
