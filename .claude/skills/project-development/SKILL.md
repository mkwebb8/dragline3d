---
name: project-development
description: Use this skill for project-level decisions about LLM-powered systems: whether LLMs suit a task, pipeline architecture design, cost estimation, and development methodology. This is the starting point for new LLM projects. Route individual tool design to tool-design; route multi-agent topology to multi-agent-patterns; route autonomous loop control to harness-engineering.
---

# Project Development Methodology

This skill addresses project-level decisions: whether LLMs suit a task, how to structure the pipeline, and how to iterate effectively. Start with minimal architecture. Validate manually before automating.

## When to Activate

Activate this skill for:
- Deciding whether LLMs are suited to the task at all
- Designing pipeline stages for an LLM-powered system
- Estimating costs before committing to an architecture
- Choosing iteration strategy for a new system
- Evaluating whether to add LLM stages to an existing pipeline

Do not activate for:
- Individual tool descriptions and schemas → tool-design
- Multi-agent topology decisions → multi-agent-patterns
- Autonomous loop control → harness-engineering
- Evaluation framework design → evaluation

## Task-Model Fit Recognition

**Proceed with LLMs for:**
- Synthesis across sources (summarization, analysis, writing)
- Subjective judgment with rubrics (quality assessment, ranking)
- Pattern recognition across unstructured data
- Tasks where "good enough" is acceptable and variability is tolerable

**Stop for:**
- Precise computation (use deterministic code)
- Perfect accuracy requirements (LLMs are probabilistic)
- Latency-critical paths where LLM inference adds unacceptable delay
- Tasks fully solvable by traditional code

## Validate Manually Before Automating

A failed manual prototype predicts a failed automated system. A successful one provides both a quality baseline and a prompt-design template.

**Manual prototype process:**
1. Execute the task by hand using the same inputs the LLM will receive
2. Record what a good output looks like — this becomes the rubric
3. Identify where judgment calls are made — these become prompt instructions
4. Only automate what works manually

## Pipeline Architecture

Structure LLM-powered projects using five stages:

| Stage | Purpose |
|-------|---------|
| **Acquire** | Fetch raw data from sources |
| **Prepare** | Transform into prompt format |
| **Process** | Execute LLM calls |
| **Parse** | Extract structured outputs |
| **Render** | Generate final deliverables |

Use the filesystem to track pipeline state rather than databases. Files provide natural idempotency (check if output exists before reprocessing) and debugging transparency (inspect any stage's output directly).

## Start Minimal

Vercel's d0 case study: improved success after reducing many specialized tools to two primitives. Resist the urge to add complexity before measuring whether simpler approaches fail.

**Minimum viable architecture:**
- One LLM call per pipeline stage
- File-based state tracking
- Manual quality review before adding automation

Expect multiple iterations as models improve. An architecture optimal for today's model may be unnecessarily complex for the next generation.

## Cost Estimation

Token costs compound quickly at scale. Estimate early:
- Tokens per call × calls per task × tasks per day × cost per token
- Include both input and output tokens
- Account for retries (budget 20% overhead)
- Include evaluation/judging calls if using LLM-as-judge

Validate cost estimates against real runs before scaling.

## Iteration Strategy

1. Manual prototype → establish quality baseline
2. Single LLM call per stage → measure accuracy vs. baseline
3. Add tool calls where needed → measure improvement
4. Add multi-agent architecture only if single-agent fails → measure isolation benefit
5. Add autonomous loops only if manual iteration is the bottleneck

## Integration

- tool-design: interface layer connecting pipeline stages to deterministic code
- multi-agent-patterns: when single-agent pipeline fails to scale
- harness-engineering: autonomous loops for the process stage
- evaluation: measuring whether iterations improve outcomes
- context-fundamentals: understanding context constraints that affect pipeline design
