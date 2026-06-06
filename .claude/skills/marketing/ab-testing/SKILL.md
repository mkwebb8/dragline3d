---
name: ab-testing
description: Use this skill to design statistically valid A/B tests, calculate sample sizes, structure hypotheses, avoid peeking problems, and build systematic experimentation programs with ICE scoring. Activate when designing experiments, interpreting test results, or building an experimentation culture.
---

# A/B Testing & Experimentation

Design statistically valid experiments. Test one variable. Pre-commit to sample size. Never peek at early results.

## Hypothesis Structure

"Because [observation], we believe [change] will cause [expected outcome] for [audience]. We'll know this is true when [metrics change by X]."

Strong hypotheses name a specific mechanism, not just "we think this will be better."

## Required Inputs

1. Baseline conversion rate and monthly traffic
2. Specific change being tested
3. Minimum detectable effect (minimum improvement worth implementing)
4. Testing tools available

## Statistical Requirements

- **Pre-commit to sample size** before starting — calculate using a sample size calculator
- **Don't peek** at results before reaching statistical significance (creates false positives)
- **Minimum 95% confidence** before declaring a winner
- **Track primary, secondary, and guardrail metrics** — a win on one metric that tanks another isn't a win

## ICE Scoring for Prioritization

Score test ideas 1–10 on:
- **Impact**: How much will it move the metric if it works?
- **Confidence**: How likely is it to work?
- **Ease**: How hard is it to implement?

Prioritize highest ICE scores first.

## Common Mistakes

- Testing two variables simultaneously (can't isolate the cause)
- Stopping early when results look good (peeking problem)
- Calling a test "inconclusive" after 3 days
- Not documenting results and learnings for future reference
- Ignoring guardrail metric damage

## Integration

- analytics: tracking infrastructure required before testing
- cro: identifying what to test
- marketing-psychology: behavioral principles to generate hypotheses
- marketing-plan: experimentation roadmap
