import type { Model, Provider } from './types';

export class ProviderManager {
  private providers: Provider[] = [
    {
      id: 'provider-openai-compatible',
      name: 'OpenAI Compatible',
      protocol: 'openai-compatible',
      baseUrl: 'https://example.com/v1',
      enabled: true,
      apiKeySet: true,
    },
    {
      id: 'provider-openai',
      name: 'OpenAI',
      protocol: 'openai',
      enabled: true,
      apiKeySet: true,
    },
    {
      id: 'provider-claude',
      name: 'Anthropic',
      protocol: 'anthropic',
      enabled: true,
      apiKeySet: false,
    },
  ];

  private models: Model[] = [
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      providerId: 'provider-openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsTools: true,
      supportsVision: true,
      supportsStreaming: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      providerId: 'provider-openai-compatible',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsTools: true,
      supportsVision: true,
      supportsStreaming: true,
    },
    {
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      providerId: 'provider-claude',
      contextWindow: 200000,
      maxOutputTokens: 32768,
      supportsTools: true,
      supportsVision: true,
      supportsStreaming: true,
    },
  ];

  listProviders(): Provider[] {
    return [...this.providers];
  }

  addProvider(provider: Provider): Provider {
    this.providers.push(provider);
    return provider;
  }

  listModels(providerId?: string): Model[] {
    if (!providerId) return [...this.models];
    return this.models.filter((model) => model.providerId === providerId);
  }

  addModel(model: Model): Model {
    this.models.push(model);
    return model;
  }
}

export const providerManager = new ProviderManager();
