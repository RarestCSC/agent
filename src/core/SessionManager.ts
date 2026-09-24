export class SessionManager {
  private sessions: Record<string, { title: string; createdAt: string; updatedAt: string }> = {};

  create(title: string) {
    const id = `session-${Date.now()}`;
    const now = new Date().toISOString();

    this.sessions[id] = {
      title,
      createdAt: now,
      updatedAt: now,
    };

    return { id, title, createdAt: now, updatedAt: now };
  }

  list() {
    return Object.entries(this.sessions).map(([id, session]) => ({ id, ...session }));
  }

  update(id: string, title: string) {
    if (!this.sessions[id]) return null;
    this.sessions[id].title = title;
    this.sessions[id].updatedAt = new Date().toISOString();
    return this.sessions[id];
  }
}
