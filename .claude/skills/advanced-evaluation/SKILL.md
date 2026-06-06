---
name: advanced-evaluation
description: Use this skill for LLM-as-judge systems: choosing between direct scoring and pairwise comparison, mitigating systematic biases (position, length, self-enhancement, verbosity, authority), writing scoring prompts that require evidence before scores, and validating automated evaluation against human judgment. Route basic evaluation framework design to evaluation; route autonomous loop control to harness-engineering.
---

# Advanced Evaluation: LLM-as-Judge

LLM-as-Judge is not a single technique but a family of approaches, each suited to different evaluation contexts. The core practice: require evidence before the score in scoring prompts so the judge must anchor its decision in observable output features before emitting a number.

## When to Activate

Activate this skill for:
- Designing LLM-as-judge systems
- Choosing between direct scoring and pairwise comparison
- Mitigating systematic evaluation biases
- A/B testing response quality
- Establishing quality standards for subjective criteria

Do not activate for:
- Basic evaluation framework design and test set construction → evaluation
- Deterministic checks and format validation (use assertion-based testing)
- Production quality gates (LLM judges are probabilistic, not deterministic)
- Tool API contract testing → tool-design

## Two Primary Approaches

### Direct Scoring
**For**: Objective criteria — factual accuracy, format compliance, completeness.
**How**: A single LLM rates one response on a defined scale.
**Prompt structure**: Evidence first, then score. "Quote the specific passage that supports your rating, then provide the score."

### Pairwise Comparison
**For**: Subjective preferences — tone, style, helpfulness.
**How**: An LLM compares two responses; the better one wins.
**Why**: Correlates better with human preference for subjective tasks than direct scoring.
**Required**: Always swap positions (A vs B, then B vs A) and average results to cancel position bias.

## Systematic Biases to Mitigate

| Bias | Description | Mitigation |
|------|-------------|------------|
| **Position bias** | Judges prefer the first or last option | Swap positions; average results |
| **Length bias** | Judges prefer longer responses regardless of quality | Score per-dimension; penalize padding explicitly |
| **Self-enhancement bias** | Models favor outputs similar to their own style | Use a different model family as judge |
| **Verbosity bias** | Conflating elaboration with quality | Include conciseness as a scored dimension |
| **Authority bias** | Deferring to confident or formal-sounding outputs | Require citation of evidence, not assertion |

## Scoring Prompt Design

Require evidence before the score:
```
1. Quote the specific output feature relevant to [dimension]
2. Explain why that feature satisfies or fails the rubric
3. Assign a score from 1-5 where: 1=..., 3=..., 5=...
```

Match scale granularity to rubric specificity. A 10-point scale for binary quality produces noisy results. Use 3-5 points for subjective dimensions.

## Validation Against Human Judgment

Validate automated evaluation against human judgment before relying on it:
- Collect human ratings on 50+ examples
- Measure correlation between LLM judge and human ratings
- Identify systematic divergences (length bias is common)
- Re-calibrate rubric or prompt to close gaps

## Key Gotchas

- **Aggregate scores hide problems**: Report per-dimension scores. An aggregate 4/5 may hide a 2/5 on accuracy.
- **Single-position pairwise**: Always swap; position bias is large enough to flip results.
- **Rubric drift**: Judges interpret rubrics differently over time. Lock the rubric; re-validate periodically.
- **Self-judge bias**: Using the same model family to judge its own outputs inflates scores.
- **Threshold calibration**: A "4/5" from one judge may mean "3/5" from another. Calibrate on shared examples.

## Integration

- evaluation: foundational framework (build that first)
- harness-engineering: locking judges as evaluators in autonomous loops
- context-optimization: token cost of running LLM judges at scale
- project-development: incorporating evaluation into the development methodology
