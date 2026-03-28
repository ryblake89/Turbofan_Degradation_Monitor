"""LangGraph state graph — wires all nodes and conditional edges."""

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from src.agents.approval import action_executor_node, approval_gate_node
from src.agents.diagnostic import diagnostic_node
from src.agents.ops_planning import ops_planning_node
from src.agents.response import response_generator_node
from src.agents.state import AgentState
from src.agents.supervisor import supervisor_node
from src.agents.trace import trace_logger_node


def _route_after_supervisor(state: dict) -> str:
    """Route from supervisor to the appropriate sub-agent."""
    if state.get("active_agent") == "ops_planning":
        return "ops_planning"
    return "diagnostic"


def _route_after_diagnostic(state: dict) -> str:
    """Route from diagnostic agent based on intent."""
    if state.get("current_intent") == "maintenance_request":
        return "ops_planning"
    return "response_generator"


def _route_after_ops_planning(state: dict) -> str:
    """Route from ops planning based on whether approval is needed."""
    if state.get("requires_approval"):
        return "approval_gate"
    return "response_generator"


def _route_after_approval(state: dict) -> str:
    """Route from approval gate based on approval decision."""
    approval = state.get("decision_trace", {}).get("approval", "")
    if approval == "approved":
        return "action_executor"
    return "response_generator"


def build_graph() -> StateGraph:
    """Construct the multi-agent state graph (uncompiled).

    Returns an uncompiled StateGraph with all nodes and conditional edges wired.
    Call .compile(checkpointer=...) on the result, or use compile_graph() instead.
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("diagnostic", diagnostic_node)
    graph.add_node("ops_planning", ops_planning_node)
    graph.add_node("response_generator", response_generator_node)
    graph.add_node("approval_gate", approval_gate_node)
    graph.add_node("action_executor", action_executor_node)
    graph.add_node("trace_logger", trace_logger_node)

    # Entry point
    graph.set_entry_point("supervisor")

    # Conditional edges
    graph.add_conditional_edges("supervisor", _route_after_supervisor, {
        "diagnostic": "diagnostic",
        "ops_planning": "ops_planning",
    })

    graph.add_conditional_edges("diagnostic", _route_after_diagnostic, {
        "ops_planning": "ops_planning",
        "response_generator": "response_generator",
    })

    graph.add_conditional_edges("ops_planning", _route_after_ops_planning, {
        "approval_gate": "approval_gate",
        "response_generator": "response_generator",
    })

    graph.add_conditional_edges("approval_gate", _route_after_approval, {
        "action_executor": "action_executor",
        "response_generator": "response_generator",
    })

    # Fixed edges
    graph.add_edge("response_generator", "trace_logger")
    graph.add_edge("action_executor", "trace_logger")
    graph.add_edge("trace_logger", END)

    return graph


def compile_graph(checkpointer=None):
    """Build and compile the graph with an optional checkpointer.

    A checkpointer is required for the interrupt/resume pattern used by
    the approval gate. If none is provided, a MemorySaver is used.
    """
    graph = build_graph()
    if checkpointer is None:
        checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)
