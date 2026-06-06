---
name: context-optimization
description: Use this skill for token-efficiency strategies at the trajectory level: KV-cache optimization, observation masking, compaction triggers, and context partitioning across sub-agents. Activate when token costs are constraining task complexity or budget. Route individual large tool output handling to filesystem-context; route session history compression to context-compression; route degradation diagnosis to context-degradation.
---

# Context Optimization

Context optimization reduces token consumption at the trajectory level — across the full sequence of turns in a task, not just a single prompt. Measure before optimizing, then measure the optimization's effect.

## When to Activate

Activate this skill when:
- Token costs are constraining task complexity or budget
- Accumulated tool outputs are crowding task-relevant content
- A single agent cannot handle the full problem without aggressive compression
- Optimizing prompt structure for inference engine cache reuse

Do not activate for:
- Diagnosing why a model ignores context → context-degradation
- Compressing session history → context-compression
- Redirecting individual large tool outputs to files → filesystem-context

## Four Primary Strategies (Ordered by Impact)

### 1. KV-Cache Optimization
Maximize prefix cache hits by structuring prompts so stable content occupies the prefix and dynamic content appears at the end. The inference engine reuses cached KV tensors for identical prefixes.

**Critical gotchas**:
- Whitespace changes invalidate cache hits entirely
- Timestamps in system prompts destroy cache effectiveness
- Reorder prompts so: system prompt → static instructions → dynamic content → user message

**Target**: 40–60% reduction in compute cost for high-volume, repeated-structure prompts.

### 2. Observation Masking
Replace large tool outputs with compact retrievable references after their purpose is served. The full output is stored in a file or memory layer; the context retains only a summary and retrieval pointer.

**When to apply**: Tool output has been processed and its full detail is no longer needed for ongoing reasoning.
**Critical gotcha**: Over-aggressive masking during debugging hides necessary error details. Keep full outputs during diagnostic phases.

**Target**: 60–80% reduction in token weight from accumulated tool outputs.

### 3. Compaction
Condense accumulated context when utilization exceeds 70%, preserving task-critical information while summarizing lower-value material. Set the trigger at 70% of known degradation onset.

**Success metric**: 50–70% token reduction through compaction while maintaining task completion quality.

### 4. Context Partitioning
Split work across sub-agents with isolated context windows when a single window cannot handle the full problem without excessive compression.

**When to use**: Three or more independent subtasks; each subtask requires substantial context; parallelization benefit exceeds coordination overhead.
**Critical gotcha**: Partitioning overhead can exceed savings for fewer than three subtasks.

## Key Principle

Measure total tokens consumed from task start to completion. An optimization that reduces per-turn cost but increases total turns may not be an improvement.

## Integration

- context-fundamentals: why attention scarcity makes optimization necessary
- context-degradation: diagnosis before optimization (fix quality first, then efficiency)
- context-compression: session history compaction (a specific compaction technique)
- filesystem-context: observation masking implementation via file storage
- multi-agent-patterns: context partitioning via sub-agent architecture
