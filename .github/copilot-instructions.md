# Copilot Instructions — AI Gateway

## Always
- Add provider in `lib/providers/`
- Define fallback order in `lib/routing/fallback.ts`
- Check semantic cache before forwarding request
- Log `request_id`, `provider`, `cache_hit`, `cost_usd` on every request
- Enforce rate limits via Upstash sliding window

## Never
- Expose provider API keys in responses
- Skip cache check for GET-equivalent requests
- Add provider inline in route handlers
