---
name: evaluation
description: Use this skill for systematically measuring agent performance: defining quality dimensions, building rubrics, constructing test sets, implementing evaluation pipelines, and establishing baselines. Evaluate outcomes, not execution sequences. Route LLM-as-judge design to advanced-evaluation; route autonomous loop governance to harness-engineering.
---

# Evaluation Methods for Agent Systems

Evaluate whether agents achieve intended outcomes through reasonable processes, not whether they followed specific execution sequences. Agents discover novel valid routes — score the destination, not the path.

## When to Activate

Activate this skill when:
- Defining quality dimensions for an agent task
- Building rubrics for multi-dimensional scoring
- Constructing test sets from real usage patterns
- Implementing automated evaluation pipelines
- Establishing baseline metrics before making changes
- Deciding whether a change improved agent performance

Do not activate for:
- LLM-as-judge design patterns and bias mitigation → advanced-evaluation
- Autonomous loop governance and control surfaces → harness-engineering

## Implementation Sequence

Build evaluation in this order:

1. Define quality dimensions matching your use case (before writing code)
2. Create descriptive rubrics with clear level definitions for each dimension
3. Construct test sets from real usage patterns (minimum 50 cases, stratified by complexity)
4. Implement automated evaluation pipelines
5. Establish baseline metrics
6. Evaluate all significant changes against baselines
7. Track metrics longitudinally for trend detection
8. Integrate human review on regular schedules
9. Separate deterministic validation from subjective quality judgments

## Multi-Dimensional Rubrics

Use separate weighted dimensions, not single scores. Example dimensions:
- Factual accuracy
- Completeness
- Citation quality
- Source reliability
- Tool efficiency

A single aggregate score hides which dimension is failing. Report per-dimension scores.

## Key Performance Drivers

Research identifies three primary factors that influence measured performance:

1. **Token usage** dominates variance — expanded exploration improves results until context quality degrades
2. **Tool call frequency** — beneficial only when calls retrieve useful information
3. **Model selection** — multiplicative effects; superior models often use resources more efficiently

## Critical Guardrails

**Avoid overfitting to specific paths**: Score outcomes, not step sequences. Agents discover novel valid routes.

**Test with realistic context sizes**: Clean-context test conditions produce misleading results. Use realistic context sizes and noise levels.

**Require multi-dimensional scoring**: Single-metric obsession reveals nothing about dimension-specific weaknesses.

**Schedule human review**: Automated evaluation misses subtle failures humans detect reliably. Build in regular human review cadence.

**Separate deterministic from subjective**: Schema validation, format checks, and tool-call success are deterministic. Response quality is subjective. Evaluate them separately.

## Test Set Construction

- Minimum 50 cases for statistical reliability
- Stratify by complexity (easy/medium/hard)
- Sample from real usage patterns, not synthetic idealized cases
- Include edge cases and failure-adjacent cases, not just golden paths
- Preserve the test set — do not update it based on model behavior

## Integration

- advanced-evaluation: LLM-as-judge design for subjective quality dimensions
- harness-engineering: governance and locking evaluators in autonomous loops
- context-degradation: evaluation helps diagnose whether degradation is occurring
- tool-design: judging whether tool set changes improved agent outcomes
