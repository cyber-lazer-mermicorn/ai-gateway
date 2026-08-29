# AI Gateway — Agent Doctrine

## What this repo is
Unified AI provider gateway: request routing, fallback chains, rate limiting, caching, and cost optimization.
By Cherry Shanaley (Chan), AI Solutions Engineer.

## Tech stack
- TypeScript strict, Next.js 15 Edge Runtime, Upstash Redis (rate limiting + caching)

## Coding rules
- Provider configs in `lib/providers/` — one file per provider
- Fallback chain defined in `lib/routing/fallback.ts` — ordered by cost then latency
- Semantic cache: embeddings stored in Redis with TTL 3600s — threshold `>= 0.92`
- Rate limiting: per-user token budget enforced via Upstash sliding window
- All requests logged with `request_id`, `provider`, `model`, `tokens`, `cache_hit`, `cost_usd`
- Never expose provider API keys in gateway responses or logs

## Commands
```bash
npm install && npm run dev
npm run test
```
