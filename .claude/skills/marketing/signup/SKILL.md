---
name: signup
description: Use this skill to optimize signup flows and registration forms for conversion. Covers field minimization, social auth placement, mobile optimization, error handling, and progressive profiling. Activate when signup conversion is low, forms have high abandonment, or designing a new signup flow.
---

# Signup Flow CRO

Minimize friction through progressive profiling. Every field reduces conversion. For each field: do we absolutely need this before they can use the product?

## Core Principles

**Essential fields only**: Email and password are typically sufficient at signup. Collect company, role, and use case data later via progressive profiling.

**Show value first**: Let users experience the product before requiring account creation when possible.

**Reduce perceived effort**: Progress indicators, smart defaults, and pre-filling decrease abandonment.

## Quick Wins

**Social auth**: Position prominently. B2B audiences prefer Google/Microsoft/SSO. One-click removes password friction entirely.

**Password UX**: Enable paste, show strength meter, include visibility toggle. Never block pasting (it encourages weak passwords).

**Mobile**: 44px+ touch targets, appropriate keyboard types (email keyboard for email field), single-column layouts.

**Error handling**: Inline validation with specific messages. Don't clear form data on error. "Email already in use" not "Invalid email."

## Testing Priorities

- Single-step vs. multi-step flows (multi-step can increase completion by reducing initial perceived effort)
- Social auth prominence vs. email form
- Field combinations (first name only vs. first + last)
- Trust messaging placement ("No credit card required," "Cancel anytime")

## Measurement

- Form start rate (% of visitors who interact with the form)
- Completion by field (identify where abandonment spikes)
- Mobile vs. desktop performance gap
- Time-to-complete

## Integration

- onboarding: what happens after signup
- cro: broader page optimization
- analytics: tracking where users drop off in the flow
- ab-testing: testing specific form variations
