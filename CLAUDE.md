# CLAUDE.md — dragline3d

## Stop-Slop Writing Rules

These rules apply to all output: code comments, commit messages, documentation, and chat responses. Derived from [stop-slop](https://github.com/hardikpandya/stop-slop).

---

### Core Rules

**1. No throat-clearing openers**
Never start with announcement phrases. State the point.

- Bad: "Here's the thing:" / "Let me be clear:" / "It turns out that"
- Bad: "Certainly!" / "Great question!" / "I'd be happy to help!"
- Good: Start with the content.

**2. No em dashes**
Use commas or periods. No em dashes at all.

**3. No adverbs**
Cut all -ly words. Also cut: really, just, literally, genuinely, honestly, simply, actually.

- Bad: "This simply returns the cached value."
- Good: "Returns the cached value."

**4. Active voice. Name the actor.**
Every sentence needs a subject doing something.

- Bad: "The error was thrown when the request failed."
- Good: "The fetch throws when the request fails."
- Bad: "The data tells us the user is logged in."
- Good: "A non-null session means the user is logged in."

**5. No false agency**
Inanimate things don't act. People and code do.

- Bad: "The component decides which view to render."
- Good: "`renderView()` picks the view based on auth state."
- Bad: "The state becomes stale."
- Good: "Cache invalidation sets stale to true after 5 minutes."

**6. No binary contrasts**
State the point directly. Drop the negation.

- Bad: "Not because X. Because Y."
- Bad: "The problem isn't X. It's Y."
- Good: "Y is the problem."

**7. No dramatic fragmentation**
No staccato short sentences for emphasis. Complete thoughts, complete sentences.

- Bad: "Fast. Reliable. Simple."
- Good: "Fast, reliable, and simple."

**8. No Wh- sentence starters**
Restructure to lead with subject or verb.

- Bad: "What makes this hard is the async boundary."
- Good: "The async boundary is the hard part."
- Bad: "Why this matters: it blocks the render."
- Good: "This blocks the render."

**9. No negative listings**
Don't list what something isn't before saying what it is.

- Bad: "Not a singleton. Not a global. A module-scoped instance."
- Good: "Module-scoped instance."

**10. No rhetorical setups**
Don't announce insight. Deliver it.

- Bad: "Here's what I mean:" / "Think about it:" / "Consider this:"
- Good: Make the point.

---

### Code Comments

Comments explain WHY, not WHAT. One line max. No multi-line comment blocks.

- Bad: `// This function fetches user data from the API`
- Bad: `// Loop through items and render each one`
- Good: `// Retry once — the CDN occasionally returns 503 on cold cache`
- Good: `// zod strips unknown keys; keep this before the DB write`

No task references in comments: no "added for", "handles the case from issue #123", "used by X flow".

---

### Commit Messages

One sentence. Active voice. Specific. No jargon.

- Bad: "Fix bug in authentication flow"
- Bad: "Refactor components to improve performance"
- Good: "Fix session token expiry check that logged out users on page refresh"
- Good: "Replace full cart re-render with line-item patch on quantity change"

---

### Responses

Apply all rules above to chat responses. No preamble. No permission-granting endings ("Feel free to ask if you need more!"). No meta-commentary ("I've gone ahead and...").

Score check (50-point threshold for revision):
- **Directness** /10 — statements, not announcements
- **Rhythm** /10 — varied sentence length
- **Trust** /10 — no explaining obvious things
- **Authenticity** /10 — sounds like a person, not a bot
- **Density** /10 — no filler

Below 35/50: revise before sending.

---

### Project: dragline3d

Next.js app. TypeScript. Tailwind CSS.

Stack: `app/` router, `components/`, `lib/`, `functions/`.
