import { Module } from '@nestjs/common';
import { BotService } from './services/bot-service/bot-service';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramUser } from './entities/telegram-user.entity';
import { AppController } from './app.controller';
import { SessionStorageService } from './services/session-storage/session-storage.service';
import { TelegramAppApiService } from './services/telegram-app-api/telegram-app-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
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
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('POSTGRES_HOST'),
          port: configService.get<number>('POSTGRES_PORT'),
          username: configService.get<string>('POSTGRES_USER'),
          password: configService.get<string>('POSTGRES_PASSWORD'),
          database: configService.get<string>('POSTGRES_DB'),
          entities: [TelegramUser],
          synchronize: true, // Should be false in production
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TelegramUser]),
  ],
  providers: [BotService, SessionStorageService, TelegramAppApiService],
  controllers: [AppController],
})
export class AppModule {}
