# Phase 0 pricing and material discrepancy report

Recorded before changing any pricing definition. This report describes source behavior only and contains no credential values.

## Active public quote path

- `lib/stl.ts` and `truenas-server.js` define the same 14 public materials and default costs.
- Slicer pricing is material cost multiplied by 2.5, plus machine time at $0.50/hour, with a $12 setup fee and a $0.50 unit-price minimum.
- `/api/pricing` can supply database-backed `material_pricing.cost_per_kg` overrides. The browser currently forwards that value to the slicer worker.
- Qualities are draft 0.28, fast 0.24, standard 0.20, and fine 0.12.
- Catalog items pay one setup fee across catalog-origin cart items; uploaded parts each pay a setup fee.
- Kentucky tax is calculated at 6% over subtotal plus shipping.

## Conflicting definitions

| Source | Difference from active quote/worker behavior |
| --- | --- |
| `app/api/checkout/route.ts` fallback | Omits PETG, PAHT-CF, and PET-CF; uses different default costs for most materials; applies an $8 unit minimum. |
| `functions/api/checkout.js` | Legacy material list includes PC and PLA-CF, omits current engineering materials, uses a $3/hour machine rate, adds a fixed amount and 8% multiplier, and has an $8 minimum. |
| `app/admin/manual-quote/page.tsx` | Maintains separate material costs and performs a manual commercial calculation independent of slicer output. |
| `app/admin/analytics/page.tsx` | Uses reporting/job-cost assumptions that are not consistently sourced from `material_pricing`. Some settings are browser-local. |
| `app/api/admin/reports/route.ts` | Uses another fixed material-cost table and fixed electricity/machine assumptions for management reporting. |
| Database `material_pricing` | Can override worker material cost for public quotes, but there is no versioned quote record binding a checkout to the price used during slicing. |

## Machine/profile differences

- The worker routes models over the K2 Plus threshold to the Ender 5 Max profile.
- The public browser's build-limit check and worker printer-routing thresholds are not identical.
- Several advanced materials use approximate fallback profiles for another material.
- Infill also changes wall-loop count in the worker, so it is not solely an infill-density control.

## Phase 0 decision

Do not centralize or normalize numeric price definitions because intent is ambiguous and doing so could change customer pricing. Preserve existing slicer-produced prices and setup behavior. Make checkout authoritative by accepting only server-signed slicer results and server-signed shipping selections. Keep the admin manual-quote calculation as an explicitly authenticated manual-pricing path.

Future pricing consolidation requires an owner-approved canonical material/cost matrix, explicit machine rates, setup-fee policy, catalog policy, tax policy, and reporting-cost policy.
