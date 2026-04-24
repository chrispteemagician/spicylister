# SpicyLister — CLAUDE.md
*For Trinity. Read before touching anything.*

## What This Is
eBay listing generator for AuDHD brains. Upload a photo → AI writes the title,
description, condition, price range, and packaging recommendation. Deployed at
spicylister.co.uk via Netlify (GitHub push = auto-deploy).

## Stack
- React 18 (Create React App) — single file: `src/App.js`
- Netlify Functions (serverless) — `functions/` folder
- Gemini Flash API — via `functions/analyze-item.js`
- Patreon OAuth — `functions/patreon-initiate.js` + `functions/patreon-auth.js`
- Tailwind CSS
- **AI rule: Gemini only. Never Anthropic API in production.**

## Key Files
| File | Purpose |
|------|---------|
| `src/App.js` | Entire frontend (~1800+ lines). All state, all UI. |
| `functions/analyze-item.js` | Gemini API call — image → listing data |
| `functions/patreon-initiate.js` | Starts Patreon OAuth (302 redirect) |
| `functions/patreon-auth.js` | Exchanges OAuth code for patron status |
| `functions/counter.js` | Global listing counter (Netlify KV) |
| `netlify.toml` | Build config + SPA redirect rules |

## Important Constants in App.js
| Constant | Line | Purpose |
|----------|------|---------|
| `OID_NETWORK` | ~241 | All 14 oids with URLs and keywords for recommendation |
| `PATREON_OAUTH_URL` | ~167 | `/.netlify/functions/patreon-initiate` |
| `CATEGORY_MAP` | ~211 | eBay category normalisation |

## State Persistence (localStorage / sessionStorage)
| Key | Storage | Purpose |
|-----|---------|---------|
| `patreon_session` | localStorage | Auth session (24hr TTL) |
| `spicylister_auto_save` | localStorage | Last generated listing (4hr TTL) |
| `spicylister_count` | localStorage | User's listing count |
| `spicylister_savings` | localStorage | Cumulative savings |
| `spicylister_pending_results` | sessionStorage | Temp save across Patreon OAuth redirect |

## Patreon Tiers
- Villager: £3/mo (300 pence+)
- Elder: £7/mo (700 pence+)
- Founder: £15/mo (1500 pence+)

## Deploy Rules
- **Never drag-to-Netlify.** Push to `main` = auto-deploy.
- Branch `claude/fix-signin-data-loss-EXBJs` has fixes pending — needs PR → main.

## OID Network Recommendation
After generating a listing, `getOidRecommendation(results)` scores the title/
category/description against `OID_NETWORK` keywords. Title hits = 3pts, body = 1pt,
threshold = 2. If matched, shows a tappable indigo banner linking to that oid.
**URL audit pending from Compass — some oids may be .netlify.app not .co.uk.**

## What NOT to Do
- Don't use Anthropic API — Gemini only
- Don't drag-to-deploy on Netlify
- Don't commit API keys (env vars in Netlify dashboard only)
- Don't remove the sessionStorage + localStorage persistence hooks
- Don't break the Patreon OAuth flow — test with ?code= in URL
