---
name: analytics
description: Use this skill for analytics implementation and measurement: setting up tracking systems (GA4, GTM, Mixpanel, Segment), building tracking plans, measuring marketing results, debugging tracking issues, UTM strategy, and privacy-compliant analytics. Activate when asked to set up tracking, build a measurement plan, or debug analytics.
---

# Analytics Tracking

Set up and improve analytics implementation to measure what matters. Track meaningful metrics that drive decisions, not vanity metrics.

## What This Covers

- Setting up tracking systems (GA4, GTM, Mixpanel, Segment, Amplitude)
- Building tracking plans with events, properties, and naming conventions
- Measuring marketing results through proper event configuration
- Debugging tracking issues and ensuring data quality
- UTM strategy and implementation
- Privacy-compliant analytics setup (GDPR, CCPA)

## Process

1. Understand business decisions that need data
2. Identify key conversions and micro-conversions
3. Assess current technical setup and gaps
4. Build structured tracking plan (events, properties, naming)
5. Guide implementation and validation

## Tracking Plan Structure

For each event document:
- Event name (snake_case convention)
- Trigger (when does it fire?)
- Properties (what metadata is captured?)
- Business question it answers

## UTM Convention

`utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term`
Establish naming conventions once; enforce them everywhere or data becomes unusable.

## Key Principle

Before adding any tracking, ask: "What decision will this data inform?" If the answer is "I might want to know this someday," don't add it.

## Integration

- ab-testing: analytics foundation required for valid experiments
- marketing-plan: measurement and RACI framework
- cro: tracking conversions being optimized
- analytics: measuring impact across all other marketing activities
