import OpenAI from 'openai';
import Groq from 'groq-sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Provider Configuration
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

// Routing Strategy
export type RoutingStrategy = 'cost' | 'speed' | 'quality' | 'balanced';

// Smart Router
export class AIRouter {
  private strategy: RoutingStrategy;
  private fallbackChain: string[] = ['groq', 'openai'];

  constructor(strategy: RoutingStrategy = 'balanced') {
    this.strategy = strategy;
  }

  selectProvider(): Provider {
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
  }

  async chat(messages: any[], options?: { maxTokens?: number; temperature?: number }) {
    let lastError: Error | null = null;

    for (const providerName of this.fallbackChain) {
      try {
        const provider = providers.find(p => p.name === providerName)!;
        return await this.callProvider(provider, messages, options);
      } catch (error) {
        lastError = error as Error;
        console.log(`Provider ${providerName} failed, trying next...`);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  private async callProvider(provider: Provider, messages: any[], options?: any) {
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
  }
}

// Usage Tracker
export class UsageTracker {
  private usage: Map<string, { tokens: number; cost: number; latency: number }[]> = new Map();

  track(provider: string, tokens: number, cost: number, latency: number) {
    const existing = this.usage.get(provider) || [];
    existing.push({ tokens, cost, latency });
    this.usage.set(provider, existing);
  }

  getStats(provider: string) {
    const records = this.usage.get(provider) || [];
    if (records.length === 0) return null;

    return {
      totalRequests: records.length,
      totalTokens: records.reduce((sum, r) => sum + r.tokens, 0),
      totalCost: records.reduce((sum, r) => sum + r.cost, 0),
      avgLatency: records.reduce((sum, r) => sum + r.latency, 0) / records.length,
    };
  }
}