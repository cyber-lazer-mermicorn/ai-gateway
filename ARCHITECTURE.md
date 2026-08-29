# Architecture

## Request flow
Incoming request → auth check → rate limit → semantic cache lookup → provider routing → fallback if needed → response + log.

## Provider routing

| Priority | Provider | Trigger |
|---|---|---|
| 1 | Groq | latency-sensitive requests |
| 2 | OpenAI | default |
| 3 | Anthropic | long context (>32k tokens) |
| Fallback | Ollama local | all providers down |

## Caching
Semantic cache uses OpenAI `text-embedding-3-small`. Cache hit = cosine similarity >= 0.92. TTL = 3600s. Cache stored in Upstash Redis.
