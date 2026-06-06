---
name: filesystem-context
description: Use this skill when using files as the primary overflow layer for agent context: redirecting large tool outputs to files, persisting plans across turns, enabling sub-agent communication via shared directories, and dynamic skill loading. Apply when tool outputs exceed ~2000 tokens, tasks span multiple turns, or multiple agents share state. Route session history compression to context-compression; route memory persistence frameworks to memory-systems.
---

# Filesystem-Based Context Engineering

Use the filesystem as the primary overflow layer when context windows constrain task completion. Static context consumes tokens regardless of relevance; load relevant content on-demand instead.

## When to Activate

Activate this skill when:
- Tool outputs exceed ~2000 tokens and need to be redirected to files
- Tasks span multiple turns and intermediate state must persist
- Multiple agents need to share state without passing it through message chains
- Dynamic skill loading is needed (load skill names only; fetch full content on activation)
- Terminal output needs to be persisted as searchable logs

Do not activate for:
- Session history compression → context-compression
- Long-term memory persistence frameworks → memory-systems
- Single-turn tasks (file I/O adds latency without benefit)

## Six Implementation Patterns

### 1. Scratch Pads
Redirect large tool outputs to files; return compact summaries to context.
```
tool_output → write to /tmp/task/output-{timestamp}.txt
              return: "Output saved to output-{timestamp}.txt (2847 tokens). Summary: ..."
```

### 2. Plan Persistence
Store structured plans in YAML or JSON. Re-read the plan file at each turn rather than keeping the full plan in context.
```yaml
# task-plan.yaml
goal: "..."
steps:
  - id: 1, status: done, summary: "..."
  - id: 2, status: in_progress
  - id: 3, status: pending
```

### 3. Sub-Agent Communication
Agents write to isolated workspace directories instead of passing state through message chains. Each agent owns its output directory; the orchestrator reads outputs rather than receiving them in context.
```
/workspace/agent-A/output.json
/workspace/agent-B/output.json
/workspace/orchestrator/merged.json
```

### 4. Dynamic Skill Loading
Include only skill names in the static system prompt. Load full skill content from files only when a skill is activated. Reduces baseline context consumption.

### 5. Terminal Persistence
Save terminal/command output as files queryable with grep. Enables selective retrieval of relevant sections without loading full output.

### 6. Self-Modification
Agents update their own instruction files with learned preferences or task-specific adaptations. The file becomes the persistent state; the context window sees only the current relevant slice.

## Diagnostic Modes

Four context problems that filesystem patterns address:
- **Missing context**: persist outputs to files → retrieve on next turn
- **Under-retrieved**: structure files for targeted line/section access
- **Over-retrieved**: offload bulk, return references with summaries
- **Buried context**: combine filesystem search with semantic methods

## Practical Tradeoffs

Apply when:
- Tool outputs exceed ~2000 tokens
- Tasks span multiple turns
- Multiple agents share state

Avoid when:
- Tasks complete in single turns (file I/O adds latency)
- Output is small enough to keep in context without crowding

**Measure**: Track token origins and validate that filesystem patterns actually reduce consumption before committing to complex implementations.

## Integration

- context-optimization: observation masking uses this pattern
- context-compression: persist compressed summaries to files
- memory-systems: file-based memory layer (simple alternative to frameworks)
- multi-agent-patterns: sub-agent communication via shared directories
- harness-engineering: durable state for long autonomous runs
