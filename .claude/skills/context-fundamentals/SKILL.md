---
name: context-fundamentals
description: Use this skill for conceptual questions about how language models use context, attention budgets, token limits, information placement, and the four core principles of context engineering. This is the prerequisite mental model skill before engaging operational context work. Route debugging to context-degradation, optimization to context-optimization, compression to context-compression, filesystem offloading to filesystem-context.
---

# Context Engineering Fundamentals

Context is the complete state available to a language model at inference time. Context engineering is the discipline of curating everything that enters a model's context window — system prompts, tool definitions, retrieved documents, message history, and tool outputs — to maximize signal within a limited attention budget. The goal is optimizing signal density, not raw token volume.

## When to Activate

Activate this skill for:
- Conceptual questions about how models process context
- Questions about attention budgets and token limits
- Information placement decisions (what goes where in a prompt)
- Understanding why adding more context can hurt performance
- The four core principles of context engineering

Do not activate for:
- Diagnosing specific context failures → context-degradation
- Reducing token consumption in production → context-optimization
- Summarizing or compressing accumulated context → context-compression
- Offloading context to files → filesystem-context

## Core Concepts

### The Four Core Principles

1. **Informativity over exhaustiveness**: Every token must earn its place. More context is not always better — irrelevant content competes for attention with critical content.

2. **Position-aware placement**: Critical information anchors at the beginning and end of context due to the U-shaped attention curve. Content in the middle receives systematically less attention (lost-in-middle pattern).

3. **Progressive disclosure**: Load only what is needed when it is needed. Static context consumes tokens regardless of relevance.

4. **Iterative curation**: Context is not set once. It should be actively managed, compressed, and updated as tasks evolve.

### Practical Constraints

- Nominal context windows ≠ effective capacity. Models degrade before hitting hard limits.
- Tool schemas inflate 2–3x after JSON serialization. A tool with 10 fields may consume 500+ tokens.
- Attention is a finite budget. Every token in context competes with every other token.

### Routing

This skill establishes mental models. Operational work routes to:
- **context-degradation**: diagnosing and fixing attention failures
- **context-optimization**: reducing token consumption systematically
- **context-compression**: compacting accumulated history
- **filesystem-context**: offloading context overflow to files

## References

- context-degradation: lost-in-middle, poisoning, distraction, confusion, clash patterns
- context-optimization: KV-cache, observation masking, compaction strategies
