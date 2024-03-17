import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionStorageService {
  private sessionData: Record<string, string> = {};

  saveSession(sessionId: string, session: string): void {
    this.sessionData[sessionId] = session;
  }

  getSession(sessionId: string): string | null {
    return this.sessionData[sessionId] || null;
  }
}
