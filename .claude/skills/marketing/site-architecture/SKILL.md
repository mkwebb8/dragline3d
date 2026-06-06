---
name: site-architecture
description: Use this skill to plan website structure, hierarchy, navigation, and internal linking strategy. Covers page hierarchy design, navigation planning (header, footer, breadcrumbs), URL structure, internal linking, and visual sitemaps using ASCII or Mermaid diagrams. Activate when building a new site, restructuring an existing one, or diagnosing SEO architecture problems.
---

# Site Architecture

Plan website structure, navigation, and internal linking. Good architecture serves both users (findability) and search engines (crawlability and authority distribution).

## What This Covers

- Page hierarchy design (homepage → sections → subsections)
- Navigation planning (header menus, footers, breadcrumbs, sidebar)
- URL structure (SEO-friendly, readable, consistent)
- Internal linking strategy (connecting pages to distribute authority)
- Visual sitemaps (ASCII trees or Mermaid diagrams)

## Required Inputs

1. New site or restructure of existing?
2. Site type (SaaS, blog, e-commerce, docs, hybrid, local business)?
3. How many pages exist or are planned?
4. Top 3 goals (conversions, SEO traffic, education, support)?
5. Primary audiences (who visits and what are they trying to find)?

## URL Structure Principles

- Use subfolders not subdomains for content (consolidates authority)
- Descriptive slugs: `/pricing` not `/p?id=3`
- Flat over deep: `/blog/post-name` over `/blog/category/subcategory/post-name`
- Consistent pluralization: `/features` everywhere, not `/features` and `/feature`
- Lowercase, hyphens not underscores

## Internal Linking Strategy

- Every page should be reachable within 3 clicks from the homepage
- Link from high-authority pages to pages you want to rank
- Use descriptive anchor text (not "click here")
- Create hub pages for topic clusters
- Competitor and alternative pages should link back to core product pages

## Visual Sitemap Format

```
/
├── /features
│   ├── /features/[feature-1]
│   └── /features/[feature-2]
├── /pricing
├── /blog
│   ├── /blog/[post-slug]
└── /[competitor]-alternative
```

## Integration

- seo-audit: architecture as foundation of technical SEO
- programmatic-seo: URL structure for at-scale pages
- content-strategy: architecture that supports content clusters
- schema: BreadcrumbList schema maps to site hierarchy
