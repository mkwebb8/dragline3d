# Dragline 3D

Industrial-grade FDM additive manufacturing — Louisville, KY.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Three.js** (in-browser STL preview)

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Pages

- `/` — Home (hero, process, materials, CTA)
- `/quote` — Upload STL → 3D preview → instant quote
- `/gallery` — Recent work
- `/about` — About Dragline 3D & Kyle Webb
- `/contact` — Contact form (mailto-based for now)

## Brand tokens

Defined in `tailwind.config.js`:

| Color | Hex | Use |
|---|---|---|
| `ironworks` | `#0F0F10` | Primary background |
| `amber` | `#FFB547` | Accent, CTAs, mark |
| `bone` | `#E8E6E1` | Text on dark |
| `steel` | `#5A5A5E` | Muted, dividers |

Fonts: **Archivo** (display, 700–900), **Inter** (body), **JetBrains Mono** (spec sheets).

## Deploy to Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Connect to Git.
3. Build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output**: `.next`
4. Add custom domain `dragline3d.com`:
   - At Porkbun → DNS → change nameservers to Cloudflare's (Cloudflare will give you two).
   - In Cloudflare Pages → Custom domains → add `dragline3d.com` and `www.dragline3d.com`.
   - SSL is automatic.

## To do next

- [ ] Replace gallery placeholders with real photos of printed parts
- [ ] Wire up `/quote` "Place order" button to Stripe Checkout
- [ ] Add server-side slicer call for accurate quotes (currently uses browser volume estimate)
- [ ] Hook contact form to Cloudflare Workers email or Resend instead of mailto
- [ ] Add order tracking page

## License

© Kyle Webb · Dragline 3D
