export class ContextManager {
  private usage = {
    system: 2000,
    tools: 3000,
    conversation: 9000,
    files: 4000,
    limit: 128000,
  };

  getUsage() {
    return {
      ...this.usage,
      total: this.usage.system + this.usage.tools + this.usage.conversation + this.usage.files,
    };
  }

  compact() {
    this.usage = {
      system: 2000,
      tools: 2000,
      conversation: 5000,
      files: 3000,
      limit: 128000,
    };

    return this.getUsage();
  }
}
