---
name: hosted-agents
description: Use this skill when designing remote sandboxed environments for agent execution: sandbox lifecycle management, image pre-building and warming, state synchronization, multiplayer collaboration, and server-first architecture. Route local single-agent context management to context-optimization or filesystem-context; route multi-agent topology to multi-agent-patterns.
---

# Hosted Agent Infrastructure

Hosted agents move execution from local machines to remote sandboxes to eliminate resource constraints, enable unlimited concurrency, and support multiplayer collaboration. Design for server-first architecture from the start.

## When to Activate

Activate this skill when:
- Designing remote execution environments for agents
- Optimizing sandbox startup latency (cold-start problem)
- Designing image pre-building and warming strategies
- Building multiplayer or collaborative agent sessions
- Choosing between per-session vs. shared sandbox isolation

Do not activate for:
- Local single-agent context management → context-optimization, filesystem-context
- Multi-agent topology decisions → multi-agent-patterns

## Three-Layer Architecture

1. **Sandbox infrastructure**: Isolated execution environments, lifecycle management, resource limits
2. **API layer**: State management, coordination, authentication, artifact extraction
3. **Client interfaces**: Slack, web, Chrome extensions — thin clients only, logic lives in the backend

## Critical Speed Optimization

Pre-build environment images on a regular cadence (every 30 minutes works well). Start warming sandboxes **as soon as a user begins typing**, not when they submit. Cold-start latency is the primary UX failure in hosted agent systems.

## Seven Design Decisions to Document Explicitly

1. Sandbox lifecycle (startup, snapshot, restoration, timeout behavior)
2. Image rebuild frequency and cache strategy
3. Read/write synchronization timing
4. Per-session state isolation approach
5. Authentication and commit attribution
6. Artifact extraction method
7. Budget and resource limits

## Server-First Framework

Structure agents as backends with thin clients across platforms. This:
- Prevents logic duplication across client surfaces
- Enables consistent behavior everywhere
- Makes multiplayer a natural extension (not a retrofit)

**Multiplayer by default**: Design for collaborative sessions from the start. With proper synchronization, it is "nearly free" and unlocks teaching, QA, and debugging workflows.

## Success Metric

Track "sessions resulting in merged PRs" rather than vanity metrics like total executions. Outcome-oriented metrics reveal whether the hosted environment is actually enabling value.

## Major Gotchas

- **Cold-start latency**: Pre-warm; don't wait for submission to start the sandbox
- **Image staleness**: Stale dependencies in pre-built images cause subtle failures. Rebuild frequently.
- **Sandbox cost runaway**: Enforce hard budget limits per session. Timeouts are not sufficient alone.
- **Missing output extraction**: Define artifact extraction before building; retrofitting it is painful.
- **Single-tenant assumption**: Designing single-tenant first makes multiplayer expensive to add later.

## Integration

- multi-agent-patterns: concurrent agents across sandboxes
- harness-engineering: control loops and governance for autonomous hosted agents
- filesystem-context: state management within sandboxes
- evaluation: measuring hosted agent effectiveness via outcome metrics
