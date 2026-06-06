---
name: context-degradation
description: Use this skill when diagnosing why a model is ignoring context, producing outputs that contradict provided information, or exhibiting degraded quality as context grows. Covers five failure patterns: lost-in-middle, poisoning, distraction, confusion, and clash. Provides mitigation strategies: write, select, compress, isolate.
---

# Context Degradation

Context degradation describes predictable failure modes as context length increases. Performance remains stable up to a model-specific threshold, then degrades rapidly — the curve is non-linear with a cliff edge, not a gentle slope. Set compaction triggers at 70% of known degradation onset, not at the threshold itself.

## When to Activate

Activate this skill when:
- A model ignores information that exists in context
- Outputs contradict provided data
- Quality on previously successful tasks has degraded
- A model applies wrong-context constraints or blends requirements from multiple sources
- Multiple correct but contradictory sources cause unpredictable output

Do not activate for:
- General token reduction → context-optimization
- Summarizing long sessions → context-compression
- Structural multi-agent design → multi-agent-patterns

## Five Failure Patterns

### 1. Lost-in-Middle
**Signals**: Critical information exists in context but the model ignores it; responses contradict provided data.
**Cause**: U-shaped attention curve — middle-positioned content receives less attention.
**Fix**: Reposition critical information to beginning or end. Use write/select to remove intervening noise.

### 2. Poisoning
**Signals**: Degraded output quality on previously successful tasks; tool misalignment; persistent hallucinations despite corrections.
**Cause**: Accumulated noise, contradictory instructions, or stale information polluting context.
**Fix**: Identify and remove the polluting content. Compress or reset context if poisoning is widespread.

### 3. Distraction
**Signals**: Even one irrelevant document causes measurable performance drops.
**Cause**: Irrelevant content competes with relevant content for attention.
**Fix**: Select only task-relevant content before loading. Apply filesystem-context for large corpora.

### 4. Confusion
**Signals**: Model applies wrong-context constraints, uses inappropriate tools, blends requirements from multiple sources.
**Cause**: Multiple instruction sets or contexts loaded simultaneously without clear priority.
**Fix**: Isolate contexts using sub-agents. Apply explicit priority rules in system prompts.

### 5. Clash
**Signals**: Multiple correct but contradictory sources cause unpredictable conflict resolution.
**Cause**: No explicit priority rules when sources conflict.
**Fix**: Add explicit priority ordering. Use select to load only the highest-priority source for a given query.

## Four Mitigation Strategies

- **Write**: Offload context to external storage when utilization exceeds 70%. Redirect large tool outputs to files.
- **Select**: Pull only relevant content through filtering before loading into context.
- **Compress**: Reduce tokens while preserving information via summarization or compaction.
- **Isolate**: Split tasks across sub-agents to prevent cross-contamination between contexts.

## Integration

- context-fundamentals: mental model for why degradation occurs
- context-optimization: systematic token reduction to prevent reaching degradation thresholds
- context-compression: compaction strategies once degradation is detected
- filesystem-context: write strategy implementation
- multi-agent-patterns: isolate strategy via sub-agent architecture
