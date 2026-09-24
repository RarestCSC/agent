export class ProviderManager {
  private providers = new Map<string, { name: string; baseUrl?: string; enabled: boolean }>();

  addProvider(id: string, name: string, baseUrl?: string) {
    this.providers.set(id, { name, baseUrl, enabled: true });
  }

  list() {
    return [...this.providers.entries()].map(([id, config]) => ({ id, ...config }));
  }
}
