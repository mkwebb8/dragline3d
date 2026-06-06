---
name: memory-systems
description: Use this skill when building persistent semantic memory across sessions, selecting a memory framework (Mem0, Zep, Letta, Cognee, LangMem), designing memory retrieval patterns, or managing memory consolidation and staleness. Start with the simplest viable layer and add complexity only when retrieval quality degrades. Route conversation compression to context-compression; route file scratchpads to filesystem-context.
---

# Memory Systems

Memory systems enable agents to maintain continuity beyond a single conversation. The core principle: start with the simplest viable layer and add complexity only when retrieval quality degrades. File-system memory often performs comparably to sophisticated tools for certain workloads.

## When to Activate

Activate this skill when:
- Building persistent state that survives across sessions
- Selecting a memory framework for a production system
- Designing retrieval patterns (when to fetch, what to fetch)
- Managing memory consolidation and staleness over time
- Implementing entity registries for identity consistency

Do not activate for:
- File scratchpads and within-session context overflow → filesystem-context
- Compressing conversation history within a session → context-compression
- Multi-agent topology decisions → multi-agent-patterns

## Memory Layers (Simplest First)

1. **Working memory**: The context window itself. No additional infrastructure.
2. **Short-term**: Session-scoped files or cache. Survives the turn, not the session restart.
3. **Long-term**: Key-value or graph databases. Survives session restarts.
4. **Entity registries**: Identity-consistent records for people, projects, preferences.
5. **Temporal knowledge graphs**: Time-aware facts with validity intervals. For facts that change.

## Framework Selection

Choose based on retrieval patterns and team capability:

| Framework | Best For |
|-----------|----------|
| **Mem0** | Fast deployment, broad integrations, general-purpose memory |
| **Zep / Graphiti** | Temporal knowledge graphs, relationship modeling |
| **Letta** | Self-editing memory with deep introspection |
| **Cognee** | Dense multi-layer semantic graphs, customizable pipelines |
| **LangMem** | Purpose-built for LangGraph workflows |

## Key Practices

**Just-in-time retrieval**: Retrieve memories when needed, not at session start. Preloading all memories wastes context budget on irrelevant content.

**Validity periods**: Assign start/end times to facts that change. Prevents stale belief persistence.

**Periodic consolidation**: Merge overlapping memories. Prevent redundant or contradictory entries from accumulating.

**Fallback strategies**: When retrieval fails, degrade gracefully. Log the failure for monitoring.

**Staleness monitoring**: Track when facts were last validated. Flag stale entries for review rather than silently using them.

## Critical Gotchas

- Preloading all memories at session start wastes context budget — use just-in-time retrieval
- Without validity periods, facts that change become stale beliefs that corrupt outputs
- Complex frameworks add latency and failure modes; file-system memory is underrated for simple workloads
- Memory consolidation must handle contradictory entries explicitly, not silently prefer newer or older

## Integration

- filesystem-context: simple file-based memory layer (often sufficient)
- context-compression: compacting session history before persisting to long-term memory
- multi-agent-patterns: shared memory across agents in a system
- context-optimization: just-in-time retrieval to minimize context consumption
