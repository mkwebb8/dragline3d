---
name: paywalls
description: Use this skill for in-app paywalls, upgrade screens, and feature gates — distinct from public pricing pages. Covers four paywall types, component design, timing principles, dark pattern avoidance, and measurement. Activate when designing or optimizing the moment free users encounter a paid feature or usage limit.
---

# Paywalls & Upgrade Screens

Optimize in-app moments where users encounter paywalls, upgrade screens, or feature gates. The goal: convert free users to paid after they've experienced value.

## Core Principle

**Value Before Ask**: Users must experience real benefit before seeing the paywall. A paywall shown before activation is a barrier; shown after activation it's an opportunity.

## Four Paywall Types

1. **Feature lock**: User tries to access a paid-only feature
2. **Usage limit**: User hits the free tier cap
3. **Trial expiration**: Free trial period ends
4. **Time-based prompt**: Gentle reminder after X days of free use

## Critical Components

- **Headline**: Benefit-focused, not plan-focused ("Get unlimited projects" not "Upgrade to Pro")
- **Value demonstration**: Show what they'll unlock, not just that it's locked
- **Feature comparison**: Free vs. paid in simple, scannable format
- **Pricing clarity**: Show the price; don't make them click to find it
- **Social proof**: One specific customer quote or result
- **CTA**: Specific action ("Start free trial" > "Upgrade" > "Buy now")
- **Easy dismiss**: Visible X or "Maybe later" — no dark patterns

## Timing Rules

Show paywalls:
- After the user has reached their activation event
- When they try to use a feature that would give them more value

Never show paywalls:
- During onboarding
- Within an active user flow (let them finish, then show)
- Immediately after signup

## What to Measure

- Paywall impression rate (% of users seeing it)
- Click-through to checkout
- Checkout completion rate
- Revenue per user by cohort
- Post-upgrade churn (sign of buyer's remorse)

## Integration

- pricing: tier structure and what to gate
- onboarding: timing paywalls after the aha moment
- ab-testing: testing paywall copy and timing
- churn-prevention: post-upgrade churn signals
