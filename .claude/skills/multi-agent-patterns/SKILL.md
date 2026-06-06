---
name: multi-agent-patterns
description: Use this skill when deciding whether to introduce sub-agents, choosing an agent topology (supervisor, peer-to-peer, hierarchical), designing handoffs, or debugging multi-agent coordination failures. Sub-agents primarily exist to isolate context, not to create organizational hierarchies. Route individual tool design to tool-design; route token efficiency within a single agent to context-optimization.
---

# Multi-Agent Patterns

The primary reason to use sub-agents is context isolation, not role anthropomorphism. Sub-agents partition the attention budget. Every other benefit — parallelization, specialization — is secondary. Token costs multiply substantially in multi-agent systems: production systems typically consume 15x baseline tokens.

## When to Activate

Activate this skill when:
- A single agent's context limits constrain task completion
- Tasks decompose naturally into parallel, independent subtasks
- Different components require distinct tool sets and system prompts
- Deciding whether one agent with more tools is better than two agents with smaller tool catalogs

Do not activate for:
- Writing tool descriptions and schemas → tool-design
- Reducing token weight within a single agent → context-optimization
- Designing memory persistence across sessions → memory-systems

## Three Primary Topologies

### 1. Supervisor / Orchestrator
A central coordinator delegates to specialist workers. The supervisor maintains the plan; workers execute subtasks and return results.

**Best for**: Clear task decomposition with human oversight needs; well-defined subtask boundaries; when the supervisor can produce a complete plan before delegating.

**Failure mode**: Supervisor bottleneck intensifies with 5+ workers. Hard cap: 3–5 workers per supervisor.

### 2. Peer-to-Peer / Swarm
Direct agent-to-agent communication through explicit handoffs. No central coordinator; agents route work to each other based on capability.

**Best for**: Dynamic tasks where rigid planning is counterproductive; emergent decomposition; when the full task structure is unknown at start.

**Failure mode**: Without coordination protocol, agents loop or drop tasks. Require explicit handoff receipts.

### 3. Hierarchical
Layered abstraction: strategy → planning → execution. Each layer manages the layer below.

**Best for**: Large projects with clear hierarchical structure; when different abstraction levels require different context and tools.

**Failure mode**: Coordination overhead at each layer. Only justified when layers have genuinely different concerns.

## Critical Design Principles

**Context isolation is the primary benefit.** Design topologies to maximize isolation of unrelated concerns, not to mirror org charts.

**The telephone game problem**: Supervisors paraphrasing sub-agent outputs lose fidelity. Allow agents to forward responses directly to users or downstream consumers when possible.

**Sycophantic consensus**: In voting or debate protocols, agents exhibit sycophantic consensus rather than accurate reasoning. Use adversarial debate and weighted voting rather than simple majority.

**Error propagation**: Hallucinations from upstream agents cascade. Validate sub-agent outputs before using them as inputs to downstream agents.

**Over-decomposition**: Handoff overhead can exceed work value. Only decompose when the parallelization or isolation benefit is measurable.

## Failure Modes

- Supervisor bottlenecks with 5+ workers
- Coordination overhead negating parallelization gains
- Sycophantic consensus in voting systems
- Error propagation from upstream hallucinations
- Over-decomposition creating handoff costs exceeding work value

## Integration

- context-fundamentals: why context isolation is the core value of sub-agents
- tool-design: what tool sets each agent receives
- context-optimization: partitioning strategy within this skill
- harness-engineering: control loops, governance, and approval gates for autonomous multi-agent systems
- memory-systems: shared state across agents between turns
