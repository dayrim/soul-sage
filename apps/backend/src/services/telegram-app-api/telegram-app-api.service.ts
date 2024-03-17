import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Api, TelegramClient } from 'telegram';
import { ConfigService } from '@nestjs/config';
import { SessionStorageService } from 'src/services/session-storage/session-storage.service';
import { StringSession } from 'telegram/sessions';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramUser } from 'src/entities/telegram-user.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { TelegramSession } from 'src/entities/telegram-session-entity';

@Injectable()
export class TelegramAppApiService implements OnModuleInit {
  private readonly logger = new Logger(TelegramAppApiService.name);
  private client: TelegramClient;

  constructor(
    @InjectRepository(TelegramSession)
    private readonly sessionRepository: Repository<TelegramSession>,
    private readonly configService: ConfigService,
    private readonly sessionStorageService: SessionStorageService,
    @InjectRepository(TelegramUser)
    private readonly userRepository: Repository<TelegramUser>,
  ) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const appId = Number(this.configService.get<number>('TELEGRAM_APP_ID'));
    const appHash = this.configService.get<string>('TELEGRAM_APP_ID_HASH');

    const sessionData = await this.loadSession('defaultSession');
    const session = new StringSession(sessionData);
    this.client = new TelegramClient(session, appId, appHash, { connectionRetries: 5 });
    await this.client.start({ botAuthToken: botToken });

    const sessionToken = this.client.session.save() as unknown as string;
    await this.saveSession('defaultSession', sessionToken);
  }
  async saveSession(sessionId: string, sessionData: string) {
    let session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (session) {
      session.sessionData = sessionData;
    } else {
      session = this.sessionRepository.create({ id: sessionId, sessionData });
    }
    await this.sessionRepository.save(session);
  }
  async loadSession(sessionId: string): Promise<string> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    return session ? session.sessionData : '';
  }
  async sendMessage(chatId: number, messageText: string): Promise<void> {
    try {
      // Assuming the client is already started and session saved
      const message = await this.client.invoke(
        new Api.messages.SendMessage({
          peer: chatId,
          message: messageText,
          noWebpage: true,
        }),
      );
      this.logger.log(message);
      this.logger.log(`Message sent to ${chatId}: ${messageText}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      throw error; // Optionally re-throw or handle error appropriately
    }
  }

  async getUserId(username: string): Promise<string | null> {
    try {
      // Assuming the client is already started
      const userEntity = await this.client.getInputEntity(username);
      return 'userId' in userEntity ? userEntity.userId.toString() : null;
    } catch (error) {
      this.logger.error('Error retrieving user information', error.stack);
      return null;
    }
  }
}
