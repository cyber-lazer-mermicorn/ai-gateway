import OpenAI from 'openai';
import Groq from 'groq-sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Provider {
  name: string;
  models: string[];
  costPer1MTokens: number;
  avgLatencyMs: number;
  qualityScore: number;
}

export const providers: Provider[] = [
  { name: 'groq', models: ['llama-3.3-70b-versatile'], costPer1MTokens: 0.59, avgLatencyMs: 100, qualityScore: 0.85 },
  { name: 'openai', models: ['gpt-4-turbo-preview'], costPer1MTokens: 10.0, avgLatencyMs: 500, qualityScore: 0.95 },
];

export type RoutingStrategy = 'cost' | 'speed' | 'quality' | 'balanced';

// Smart Router
export class AIRouter {
  private strategy: RoutingStrategy;
  private fallbackChain: string[] = ['groq', 'openai'];

  constructor(strategy: RoutingStrategy = 'balanced') {
    this.strategy = strategy;
  }

  selectProvider(): Provider {
    try {
      const sorted = [...providers].sort((a, b) => {
        switch (this.strategy) {
          case 'cost': return a.costPer1MTokens - b.costPer1MTokens;
          case 'speed': return a.avgLatencyMs - b.avgLatencyMs;
          case 'quality': return b.qualityScore - a.qualityScore;
          case 'balanced':
          default:
            return (b.qualityScore / b.avgLatencyMs) - (a.qualityScore / a.avgLatencyMs);
        }
      });
      return sorted[0];
    } catch (error: any) {
      throw new Error(`Select provider error: ${error?.message || 'Unknown error'}`);
    }
  }

  async chat(messages: any[], options?: { maxTokens?: number; temperature?: number }) {
    let lastError: Error | null = null;

    for (const providerName of this.fallbackChain) {
      try {
        const provider = providers.find(p => p.name === providerName)!;
        return await this.callProvider(provider, messages, options);
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All providers failed');
  }

  private async callProvider(provider: Provider, messages: any[], options?: any) {
    try {
      if (provider.name === 'groq') {
        const response = await groq.chat.completions.create({
          model: provider.models[0],
          messages,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature || 0.7,
        });
        return { provider: provider.name, content: response.choices[0].message.content };
      }

      if (provider.name === 'openai') {
        const response = await openai.chat.completions.create({
          model: provider.models[0],
          messages,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature || 0.7,
        });
        return { provider: provider.name, content: response.choices[0].message.content };
      }

      throw new Error(`Unknown provider: ${provider.name}`);
    } catch (error: any) {
      throw new Error(`Call provider error: ${error?.message || 'Unknown error'}`);
    }
  }
}

// Caching Layer
export class CacheLayer {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  constructor(private ttlMs: number = 60000) {}

  get(key: string): any | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiry) {
        this.cache.delete(key);
        return null;
      }
      return entry.data;
    } catch (error: any) {
      throw new Error(`Cache get error: ${error?.message || 'Unknown error'}`);
    }
  }

  set(key: string, data: any) {
    try {
      this.cache.set(key, { data, expiry: Date.now() + this.ttlMs });
    } catch (error: any) {
      throw new Error(`Cache set error: ${error?.message || 'Unknown error'}`);
    }
  }

  clear() {
    try {
      this.cache.clear();
    } catch (error: any) {
      throw new Error(`Cache clear error: ${error?.message || 'Unknown error'}`);
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Usage Tracker
export class UsageTracker {
  private usage: Map<string, { tokens: number; cost: number; latency: number }[]> = new Map();

  track(provider: string, tokens: number, cost: number, latency: number) {
    try {
      const existing = this.usage.get(provider) || [];
      existing.push({ tokens, cost, latency });
      this.usage.set(provider, existing);
    } catch (error: any) {
      throw new Error(`Track usage error: ${error?.message || 'Unknown error'}`);
    }
  }

  getStats(provider: string) {
    try {
      const records = this.usage.get(provider) || [];
      if (records.length === 0) return null;

      return {
        totalRequests: records.length,
        totalTokens: records.reduce((sum, r) => sum + r.tokens, 0),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        avgLatency: records.reduce((sum, r) => sum + r.latency, 0) / records.length,
      };
    } catch (error: any) {
      throw new Error(`Get stats error: ${error?.message || 'Unknown error'}`);
    }
  }

  getAllStats() {
    try {
      const stats: Record<string, any> = {};
      for (const [provider] of this.usage) {
        stats[provider] = this.getStats(provider);
      }
      return stats;
    } catch (error: any) {
      throw new Error(`Get all stats error: ${error?.message || 'Unknown error'}`);
    }
  }
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error('Retry failed');
}
