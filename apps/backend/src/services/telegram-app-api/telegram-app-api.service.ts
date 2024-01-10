import { Injectable, Logger } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { ConfigService } from '@nestjs/config';
import { SessionStorageService } from 'src/services/session-storage/session-storage.service';
import { StringSession } from 'telegram/sessions';

@Injectable()
export class TelegramAppApiService {
  private readonly logger = new Logger(TelegramAppApiService.name);

  constructor(private readonly configService: ConfigService, private readonly sessionStorageService: SessionStorageService) {}

  async getUserId(sessionId: string, username: string): Promise<string | null> {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const appId = this.configService.get<number>('TELEGRAM_APP_ID');
    const appIdHash = this.configService.get<string>('TELEGRAM_APP_ID_HASH');

    try {
      const stringSession = this.sessionStorageService.getSession(sessionId);

      const session = stringSession ? new StringSession(JSON.parse(stringSession)) : new StringSession();
      const client = new TelegramClient(session, Number(appId), appIdHash, {
        connectionRetries: 5,
      });
      await client.start({ botAuthToken: botToken });
      const sessionToken = JSON.stringify(client.session.save());
      this.sessionStorageService.saveSession(sessionId, sessionToken);

      const userEntity = await client.getInputEntity(username);
      return 'userId' in userEntity ? userEntity.userId.toString() : null;
    } catch (error) {
      this.logger.error('Error retrieving user information', error.stack);
      return null;
    }
  }
}
