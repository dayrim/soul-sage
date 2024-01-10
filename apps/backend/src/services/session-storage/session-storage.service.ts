import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionStorageService {
  private sessionData: Record<string, string> = {};

  saveSession(userId: string, session: string): void {
    this.sessionData[userId] = session;
  }

  getSession(userId: string): string | null {
    return this.sessionData[userId] || null;
  }
}
