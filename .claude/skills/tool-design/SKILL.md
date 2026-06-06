---
name: tool-design
description: Use this skill for the tool-interface layer of an agent system: writing tool descriptions agents can route on, designing tool schemas and response formats, naming conventions, actionable error recovery messages, MCP server design, tool-set consolidation, and deciding when to add or remove an individual tool. Route project-shape and pipeline architecture to project-development; route deciding whether to introduce sub-agents to multi-agent-patterns; route trajectory-level token efficiency of tool outputs to context-optimization.
---

# Tool Design for Agents

Design every tool as a contract between a deterministic system and a non-deterministic agent. Agents infer intent from descriptions alone and generate calls that must match expected formats. Every ambiguity becomes a potential failure mode.

The consolidation principle: if a human engineer cannot definitively say which tool should be used in a given situation, an agent cannot be expected to do better. Reduce the tool set until each tool has one unambiguous purpose.

## When to Activate

Activate this skill when the unit of work is a tool:
- Writing a new tool description, schema, or response format
- Debugging cases where the agent picked the wrong tool or generated malformed calls
- Consolidating an overlapping tool catalog
- Designing actionable error messages for agent self-correction
- Naming tools and parameters consistently across a catalog
- Evaluating a third-party tool before adding it

Do not activate for:
- Project pipeline architecture → project-development
- Whether to split work across sub-agents → multi-agent-patterns
- Trajectory-level token efficiency of accumulated tool outputs → context-optimization

## Tool Description Engineering

Every tool description must answer four questions:
1. **What does it do?** State exactly what the tool accomplishes. No vague language like "helps with."
2. **When should it be used?** Direct triggers and indirect signals.
3. **What inputs does it accept?** Types, constraints, defaults, format examples for each parameter.
4. **What does it return?** Output format, success and error examples.

Treat descriptions as prompt engineering injected into agent context. A vague description like "Search the database" forces guessing — and guessing produces incorrect calls.

## The Consolidation Principle

Build single comprehensive tools instead of multiple narrow overlapping tools. Rather than `list_users`, `list_events`, `create_event` separately, implement `schedule_event` that handles the full workflow.

**When not to consolidate**: Keep tools separate when they have fundamentally different behaviors, serve different contexts, or must be callable independently. Over-consolidation creates tools with too many parameters that agents struggle to parameterize correctly (>8–10 parameters is a signal to split).

## Architectural Reduction

Push consolidation to its extreme: replace most specialized tools with primitive, general-purpose capabilities. Production evidence (Vercel d0 case study) shows reducing specialized tools to small primitive sets outperforms sophisticated multi-tool architectures.

**The File System Agent Pattern**: Provide direct file system access through a single command execution tool. The agent uses standard Unix utilities (grep, cat, find, ls) to explore. Works because: file systems are a proven abstraction models understand deeply, standard tools have predictable behavior, agents chain primitives flexibly.

## Tool Definition Schema

- **Name**: verb-noun pattern (`get_customer`, `create_order`)
- **Parameters**: consistent names across tools (always `customer_id`, never sometimes `id`)
- **Return shape**: success and error payloads documented and machine-readable
- **Defaults**: reflect common use cases; eliminate unnecessary parameter specification

## MCP Naming Requirements

Always use fully qualified tool names: `ServerName:tool_name`. Without the server prefix, agents fail to locate tools when multiple MCP servers are available.

## Response Format Optimization

Offer concise vs. detailed response format options. Concise returns essential fields only; detailed returns complete objects. Document when to use each in the tool description so agents learn to select appropriately.

## Error Message Design

Every error must be actionable for agents:
- State what went wrong and how to correct it
- Include retry guidance for retryable errors
- Include corrected format examples for input errors
- Specify which field is missing for incomplete requests

"Error occurred" provides zero recovery signal.

## Tool Audit Checklist

Before adding any tool:
1. Name: verb-noun, namespaced if catalog has multiple domains
2. Description: answers what, when, and what returns
3. Schema: every parameter has type, constraints, defaults, example
4. Return shape: success and error payloads documented
5. Recovery: each error tells agent what to change before retrying
6. Overlap: no other tool has the same activation scenario
7. Consolidation: adjacent narrow tools merged unless independent calls required
8. Token impact: large responses support concise mode or file-reference mode

## Gotchas

- **Vague descriptions**: "Search the database" leaves too many questions. State exact database, query format, return shape.
- **Cryptic parameter names**: `x`, `val`, `param1` force guessing. Use descriptive names.
- **Missing error recovery**: Generic "Error occurred" provides no recovery signal.
- **Inconsistent naming**: `id` in one tool, `identifier` in another, `customer_id` in a third creates confusion.
- **MCP namespace collisions**: Multiple servers with similar tool names cause routing failures. Always qualify.
- **Description rot**: Descriptions become inaccurate as APIs evolve. Treat them as code — version and test them.
- **Over-consolidation**: >8–10 parameters or fundamentally different use cases → split.
- **Parameter explosion**: Too many optional parameters overwhelm agent decision-making.

## Integration

- project-development: shape of the project, pipeline stages, task-model-fit
- multi-agent-patterns: whether to split into sub-agents vs. more tools per agent
- context-optimization: trajectory-level token efficiency of accumulated tool outputs
- context-fundamentals: how tool definitions consume the attention budget
- evaluation: judging whether the tool set improved agent outcomes
