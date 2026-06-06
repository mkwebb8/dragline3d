---
name: context-compression
description: Use this skill for compressing accumulated conversation history or long context into fewer tokens while preserving task-critical information. Covers three strategies: anchored iterative summarization, opaque compression, and regenerative full summary. Route token-efficiency at the trajectory level to context-optimization; route offloading large outputs to filesystem-context.
---

# Context Compression

Context compression reduces token volume in accumulated history while preserving information needed to continue the task. Measure total tokens consumed from task start to completion, not tokens per individual request — aggressive compression that causes re-fetching wastes more tokens than it saves.

## When to Activate

Activate this skill when:
- Conversation history is consuming a large fraction of the context window
- Approaching context limits mid-task with significant work remaining
- Session continuity requires preserving state across a compaction boundary
- Tool output history has accumulated to the point of crowding task-relevant content

Do not activate for:
- KV-cache optimization and observation masking → context-optimization
- Diagnosing why context quality is failing → context-degradation
- Offloading individual large tool outputs to files → filesystem-context

## Three Compression Strategies

### 1. Anchored Iterative Summarization
**When**: Long sessions where file tracking and intermediate decisions matter.
**How**: Maintain a running summary file updated after each significant exchange. The summary anchors at the top of context; full history is dropped.
**Tradeoff**: Preserves continuity and reasoning trail. Adds file I/O overhead.

### 2. Opaque Compression
**When**: Maximum token savings needed and re-fetching costs are low.
**How**: Replace accumulated history with a compact structured representation (key decisions, current state, next actions). Discard intermediate reasoning.
**Tradeoff**: Maximum compression ratio. Loses nuance and intermediate reasoning that may matter later.

### 3. Regenerative Full Summary
**When**: Readability is critical and the compacted context will be shared with humans or other agents.
**How**: Generate a full narrative summary of session state, suitable for cold handoff. Prioritize clarity over compression ratio.
**Tradeoff**: Higher quality output. Lower compression ratio than opaque approach.

## Key Principle

Measure effectiveness by total token cost across the full task trajectory, not just the size of the compressed output. A compression that forces three subsequent re-fetches costs more than no compression at all.

## Integration

- context-optimization: KV-cache and observation masking for trajectory-level efficiency
- context-degradation: diagnosing when accumulated context has degraded quality
- filesystem-context: persist compressed summaries to files for retrieval across sessions
- memory-systems: long-term memory layer for persisting session state beyond compression
