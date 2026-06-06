---
name: latent-briefing
description: Use this skill when designing systems where worker agents need access to orchestrator state without replaying full reasoning trajectories, or when debugging token explosion in recursive agent graphs. Requires direct runtime control over KV tensors — not applicable to API-only stacks. Route general multi-agent patterns to multi-agent-patterns; route text-level summarization to context-compression.
---

# Latent Briefing and KV Cache Memory Sharing

Latent Briefing is a technique for efficient cross-agent state transfer in hierarchical multi-agent systems. It shares memory at the **representation level** rather than the text level, compacting the KV cache to retain only task-relevant positions.

## When to Activate

Activate this skill when:
- Workers need access to orchestrator reasoning state without replaying full trajectories
- Debugging token explosion in recursive agent graphs
- Designing systems with direct KV tensor access at inference time

Do not activate for:
- API-only stacks without KV tensor access (use context-compression instead)
- General multi-agent patterns without representation-level sharing → multi-agent-patterns
- Text-level summarization for handoffs → context-compression

## The Core Problem

When orchestrators delegate work to multiple workers, passing the full reasoning trajectory as text creates token cost explosion:
- Summarization introduces latency and information loss
- Retrieval systems don't preserve the orchestrator's evolving reasoning state
- Full trajectory replay is prohibitively expensive at scale

## Core Mechanism

Built on Attention Matching (AM) KV cache compaction with three modifications:

1. **Task-guided queries**: Derived from the current worker prompt, not fixed
2. **Shared global token masking**: Applied across all attention heads consistently
3. **Robust thresholding**: Uses median + tau × MAD rather than fixed top-k selection

This selects and transfers only the KV positions relevant to the worker's task, not the full orchestrator context.

## Critical Preconditions

- Requires direct runtime control over worker inference to inspect and transform KV state
- Impractical for hosted APIs that abstract away the KV cache
- Assumes orchestrator and worker share compatible model spaces: same tokenizer, architecture, and attention layout

## Tradeoffs vs. Text-Level Alternatives

| Approach | Latency | Fidelity | Infrastructure Cost |
|----------|---------|----------|---------------------|
| Full trajectory replay | High | Perfect | Low |
| Text summarization | Medium | Lossy | Low |
| Retrieval (RAG) | Medium | Partial | Medium |
| Latent Briefing | Low | High | High |

## Integration

- multi-agent-patterns: architectural context for when latent briefing applies
- context-compression: text-level alternative when KV access is unavailable
- context-optimization: KV-cache optimization for simpler cases (prefix reuse)
- hosted-agents: infrastructure requirements for KV tensor access at inference time
