import { kinds } from "./kinds";
import {
  VisualGraph,
  GraphNode,
  NodeData,
  PreviewCtx,
  DotValue,
  encodeDotId,
  decodeDotId,
} from "./graph";
import { computed } from "vue";

export class EvalContext {
  graph: VisualGraph;
  data: Map<GraphNode, NodeData> = new Map();
  constructor(graph: VisualGraph) {
    this.graph = graph;
  }

  nodeData(nodeId: number): NodeData | null {
    const node = this.graph.nodes.get(nodeId);
    if (node == null) {
      return null;
    }
    let data = this.data.get(node);
    if (data == null) {
      const kind = kinds.get(node.kind);
      if (kind == null) {
        return null;
      }

      const ctx = this.getCtx(nodeId);
      this.data.set(
        node,
        (data = {
          inputs: kind.inputs.map((input, i) => {
            return computed(() => {
              const comp = ctx.getInput(i);
              if (comp != null) {
                return comp.kind;
              }
              return input.kind;
            });
          }),
          outputs: kind.outputs.map((output) =>
            computed(() => output.run(ctx))
          ),
          preview() {
            return kind.preview == null ? null : kind.preview(ctx);
          },
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
