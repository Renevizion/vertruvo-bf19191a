# WHITE GLOVE — Discovery Framework

> SEO · AEO · GEO · AIO · Schema · Structured Data · AI Discovery
> A complete layered system for making any tool, product, or business discoverable, citable, and conversion-ready across traditional search AND modern AI engines.

A project is not "optimized" until **every** layer passes.

---

## 1. The four layers

| Layer | Reads it | What it does | Where it lives in Kiruvo |
|---|---|---|---|
| **SEO** | Google, Bing | Ranks pages via title/meta/H1/speed/links | `index.html`, `public/robots.txt`, `public/sitemap.xml`, `react-helmet-async` per-route |
| **AEO** | Siri, Alexa, featured snippets | Extracts direct answers (FAQ blocks ≤30 words) | `FAQPage` JSON-LD per landing page |
| **GEO** | ChatGPT, Perplexity, Gemini, Claude | Gets the entity **cited** via citations + structured data | `public/llms.txt`, JSON-LD `Organization`/`SoftwareApplication`, third-party mentions |
| **AIO** | All AI engines + knowledge graphs | Entity recognition via consistent NAP + JSON-LD + cross-platform integrity | NAP block, sameAs links, profile parity (GBP, social, directories) |

---

## 2. Where each layer is wired in this app

| Layer | File / surface | Capability key |
|---|---|---|
| SEO sitewide head | `index.html` | `disco.schema` |
| SEO per-route head | `react-helmet-async` `<Helmet>` blocks | `disco.schema` |
| Crawler rules | `public/robots.txt` | `disco.schema` |
| Sitemap | `public/sitemap.xml` | `disco.schema` |
| AEO FAQ blocks | `FAQPage` JSON-LD on `/`, `/pricing`, etc. | `disco.aeo` |
| GEO entity manifest | `public/llms.txt` | `disco.aeo` |
| AIO NAP/sameAs | `Organization` JSON-LD in `index.html` | `disco.schema` |

The two registry capabilities — **`disco.schema`** and **`disco.aeo`** — make discovery a first-class platform verb, callable from every shell (SaaS settings, white-label tenants, agent, API).

---

## 3. The execution sequence (every project)

1. **Identify** — passive audit. Google the target, view-source for `application/ld+json`, screenshot any rich-results errors, check GBP rating + review count.
2. **Prepare** — pre-write JSON-LD with real NAP, pre-write 4-question FAQ (answers <30 words), pre-write review-request SMS, ready a revenue-language pitch.
3. **Pitch** — open with the revenue problem, show the screenshot of the entity's own error, show the fix already written. Never explain "what schema is" — say *"this is the code that tells AI who you are."*
4. **Deploy** — paste schema into `<head>`, fix `<title>` + meta description, drop FAQ block, validate with Google Rich Results Test, send before/after snippet.
5. **Upsell** — once Tier 1 validates, demo the booking/intake widget that replaces "call us" with capture.

---

## 4. Pass/fail checklist (the gate)

A surface ships when **every** row passes.

### SEO
- [ ] `<title>` ≤60 chars, contains primary keyword, unique per route
- [ ] Meta description ≤160 chars, unique per route
- [ ] Single `<h1>` per page matching primary intent
- [ ] Canonical link present and absolute
- [ ] `og:title`, `og:description`, `og:url`, `og:type` set
- [ ] `robots.txt` allows public routes, blocks authenticated routes
- [ ] `sitemap.xml` lists every public route with `<lastmod>`

### AEO
- [ ] `FAQPage` JSON-LD with 3–5 Q&A pairs (answers ≤30 words)
- [ ] H2/H3 headings phrased as user questions where natural
- [ ] First 160 chars of body answers the page's primary question

### GEO
- [ ] `public/llms.txt` present, name + summary + sectioned links
- [ ] `Organization` or `SoftwareApplication` JSON-LD with `name`, `url`, `sameAs`
- [ ] Third-party citations (directory, press, partner) for the entity
- [ ] AI-cite test: ask ChatGPT/Perplexity *"what is X?"* — entity appears

### AIO
- [ ] NAP (name, address, phone) consistent across site, GBP, socials
- [ ] `sameAs` array links every owned profile (LinkedIn, IG, TikTok, GBP)
- [ ] Review count ≥20, rating ≥4.5 on at least one engine
- [ ] Knowledge-graph test: branded search shows a panel

---

## 5. Emergent scoring

Three derived metrics drive prioritization.

- **Opportunity Score (0–100)** — severity + revenue leak + maturity gap + review-authority gap. 70+ = walk in this week.
- **Displacement Risk** — odds a competitor takes their customers via AI search in 6–12 months. No schema +15, no mobile +10, <20 reviews +10, <4.0 rating +15.
- **Revenue Recovery Estimate** — `(criticals × $400) + (highs × $200) + (leaks × $150)` ±40%. The floor number that justifies the retainer.

---

## 6. Pitch language — translate every fix into money

| Technical fix | What you say |
|---|---|
| No JSON-LD | "AI engines can't find you. Competitors who have this are getting bookings you're not." |
| Default `<title>` | "Google is using your code name as your headline. We replace it with the words your customers type." |
| Missing FAQ schema | "When someone asks Siri about your service, you don't show up. We fix that today." |
| No `llms.txt` | "ChatGPT recommends competitors over you because they're machine-readable. We add the file that gets you in the answer." |
| Inconsistent NAP | "Google can't decide if you're one business or three. Until that's fixed it won't put you on the map pack." |

---

## 7. Skill: `white-glove-discovery`

The whole framework is packaged as a runnable skill that audits and remediates a target surface end-to-end. See `.agents/skills/white-glove-discovery/SKILL.md` and `src/skills/registry.ts`. Triggers: *"audit discovery"*, *"white glove"*, *"AI discovery"*, *"GEO audit"*.

It composes `disco.schema`, `disco.aeo`, and `content.hub` — entitlement-gated like every skill, callable from any shell.

---

## 8. When to apply

- New product/page launch — run all four layer checklists before "live"
- Client audit — collect NAP, view-source for schema, screenshot errors, score the gap
- Refresh — re-run the checklist quarterly on owned properties

## 9. When NOT to apply

- One-off content edits with no discovery surface
- Internal-only / authenticated routes (already `Disallow` in robots)
