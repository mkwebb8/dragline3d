---
name: churn-prevention
description: Use this skill to reduce voluntary and involuntary churn. Covers cancel flow architecture, exit survey design, offer-to-reason matching, dunning/payment recovery sequences, and save rate benchmarks. Activate when designing cancel flows, building dunning sequences, or diagnosing high churn rates.
---

# Churn Prevention

Reduce voluntary churn (customer-initiated, 50–70% of total) and involuntary churn (failed payments, 30–50%, but highly recoverable).

## Cancel Flow Architecture

Standard flow: Trigger → Survey → Dynamic Offer → Confirmation → Post-Cancel

The exit survey is foundational. Ask "What's the main reason?" with 5–8 targeted options. The answer determines which save offer displays.

## Offer-to-Reason Matching

| Reason | Offer |
|--------|-------|
| Too expensive | 20–30% discount for 2–3 months |
| Not using enough | Pause (1–3 months) or onboarding call |
| Missing features | Roadmap preview + timeline commitment |
| Switching to competitor | Comparative positioning + discount |
| Business is closing | Acknowledge; offer pause |

## Payment Recovery (Dunning)

Sequence: Pre-dunning alerts → Smart retries → Email sequence → Grace period → Hard cancel

**Smart retries**: Vary by decline type.
- Soft declines (insufficient funds): Retry 3–5x over 7–10 days
- Hard declines (card invalid): Immediate email + update request

**Success benchmark**: 50–60% payment recovery rate is achievable.

## Measurement

- Cancel flow save rate: target 25–35%
- Offer acceptance rate: target 15–25%
- Dunning recovery rate: target 50–60%
- Net Revenue Retention: the ultimate churn metric (>100% = expansion exceeds churn)

## Integration

- emails: dunning and save email sequences
- onboarding: poor onboarding is a leading churn predictor
- analytics: tracking save rates and recovery rates
- revops: CRM automation for churn signals and save workflows
