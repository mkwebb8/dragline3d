---
name: schema
description: Use this skill to implement schema.org structured data markup to enable rich results in Google Search. Covers Product, Article, FAQ, Organization, BreadcrumbList, Event, LocalBusiness, HowTo, and other schema types. Always outputs JSON-LD format. Validate with Google Rich Results Test. Activate when adding structured data, debugging rich result eligibility, or improving search appearance.
---

# Schema Markup

Implement structured data to enable rich results in Google Search. Always use JSON-LD format (Google's preferred format). Validate all markup in Google's Rich Results Test before publishing.

## Supported Schema Types

- **Product**: Price, availability, reviews for e-commerce
- **Article / BlogPosting**: Published date, author, headline for content
- **FAQ**: Question-and-answer sections (displays as expandable in SERP)
- **Organization**: Company name, logo, contact, social profiles
- **BreadcrumbList**: Navigation hierarchy
- **Event**: Date, location, ticket links
- **LocalBusiness**: Address, hours, phone for local SEO
- **HowTo**: Step-by-step instructions
- **SoftwareApplication**: App store links, pricing, categories

## JSON-LD Structure

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Question text here",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Answer text here"
    }
  }]
}
</script>
```

## Required Inputs

1. Page type (what content is being marked up?)
2. Current schema (any existing markup?)
3. Goals (which rich results to achieve?)
4. Tech stack (static HTML, WordPress, React, etc.?)

## Rules

- Schema must match visible page content — no markup for content not shown to users
- Place JSON-LD in `<head>` or at bottom of `<body>`
- One schema block per page is fine; multiple are supported for complex pages

## Integration

- seo-audit: schema as part of technical SEO
- ai-seo: structured data improves AI citation eligibility
- site-architecture: schema supports breadcrumb navigation
