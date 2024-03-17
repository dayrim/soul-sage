import { Logger, Module, Provider } from '@nestjs/common';
import { BotService } from './services/bot-service/bot-service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { TelegramUser } from './entities/telegram-user.entity';
import { AppController } from './app.controller';
import { SessionStorageService } from './services/session-storage/session-storage.service';
import { TelegramAppApiService } from './services/telegram-app-api/telegram-app-api.service';
import typeorm from './config/typeorm';
import { TelegramChat } from './entities/telegram-chat-entity';
import { TelegramMessage } from './entities/telegram-message.entity';
import { TelegramSession } from './entities/telegram-session-entity';
import { buildCustomRepositoryProvider } from './shared/generic-repository';
import { OpenAIService } from './services/openai/openai.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      load: [typeorm],
    }),
    TelegrafModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          launchOptions: {
            webhook: {
              domain: configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN'),
              hookPath: '/secret-path',
            },
          },
        };
      },

      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => configService.get('typeorm'),
    }),
    TypeOrmModule.forFeature([TelegramUser, TelegramChat, TelegramMessage, TelegramSession]),
    HttpModule,
  ],
  providers: [
    BotService,
    SessionStorageService,
    TelegramAppApiService,
    buildCustomRepositoryProvider<TelegramUser>(TelegramUser),
    buildCustomRepositoryProvider<TelegramChat>(TelegramChat),
    OpenAIService,
  ],
  controllers: [AppController],
})
export class AppModule {}
