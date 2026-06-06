---
name: harness-engineering
description: Use this skill when designing control systems around autonomous agents: defining editable vs. locked surfaces, implementing tight feedback loops, managing durable state for long runs, preventing search gaming, and setting human approval gates. Route multi-agent topology decisions to multi-agent-patterns; route evaluation rubric design to evaluation.
---

# Harness Engineering

Harness engineering designs control systems around autonomous agents — defining what they may edit, how they receive feedback, where state is stored, and who approves irreversible actions. Human approval remains distinct from proposal preparation: agents can draft PRs but not merge without explicit permission.

## When to Activate

Activate this skill when:
- Designing control loops for autonomous agents
- Defining which surfaces agents may and may not modify
- Implementing feedback mechanisms for agent self-improvement
- Managing state for long-running autonomous tasks
- Setting human approval gates for irreversible actions
- Preventing agents from gaming evaluation metrics

Do not activate for:
- Multi-agent topology decisions → multi-agent-patterns
- Evaluation rubric design → evaluation
- Tool interface design → tool-design

## Four Surface Types

| Surface | Definition | Examples |
|---------|------------|---------|
| **Locked** | Agent cannot modify | Evaluation metrics, rubrics, safety constraints |
| **Editable** | Agent can change during loops | Code, prompts, config files |
| **Append-only** | Agent may extend but not rewrite | Logs, result files, experiment records |
| **Human-controlled** | Requires explicit approval | Deployments, merges, destructive operations |

**Lock evaluators before starting loops.** An agent that can modify its own evaluation metric will optimize the metric, not the task.

## Tight Feedback Mechanisms

Effective autonomy requires feedback that is fast, unambiguous, and hard to game. A tight feedback loop includes:
- One editable artifact
- One locked evaluator
- Fixed budgets (token, time, iteration)
- Clear metrics
- Version control rollback
- Durable result logs

## Durable State for Long Runs

Autonomous systems must externalize plans, source queues, results, and failure records in files — not chat history alone. This enables agent handoffs without context loss and supports post-run analysis.

Required state artifacts:
- Current plan / task queue (YAML or JSON)
- Source retrieval evidence (what was fetched, when)
- Result log (append-only, timestamped)
- Failure record (rejected attempts preserved, not discarded)

## Search Discipline

Prevent agents from exploiting the nearest optimization surface:
- Schedule upstream source refreshes on a fixed cadence
- Require novelty checks before major budget spending
- Preserve rejected attempts to prevent rediscovery of discarded ideas
- Apply leave-one-out pruning when stacks grow
- Prefer equal-quality simplification over complexity

## Human Approval Gates

Agents prepare; humans decide. Governance changes, merges, and destructive operations route to human review regardless of agent confidence.

**Anti-pattern**: Treating agent-proposed changes as approved because the agent passed internal gates. Internal gates verify correctness; human approval authorizes action.

## Critical Safeguards

1. Lock evaluators before starting loops — never after
2. Preserve rejected attempts: prevent rediscovery of discarded paths
3. Require source retrieval evidence before citations
4. Route governance changes to human review
5. Report per-dimension scores, not aggregates alone
6. Set hard iteration and budget limits; autonomous loops do not self-terminate reliably

## Integration

- evaluation: locked evaluator design
- multi-agent-patterns: autonomous multi-agent systems governed by harness
- filesystem-context: durable state storage for long runs
- hosted-agents: infrastructure for remote autonomous execution
- advanced-evaluation: LLM judges as locked evaluators
