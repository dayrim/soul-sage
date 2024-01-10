import { Update, Ctx, Start, Command } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { TelegramUser } from '../../entities/telegram-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TelegramAppApiService } from '../telegram-app-api/telegram-app-api.service';
@Update()
export class BotService {
  private readonly webUrl: string;
  constructor(
    @InjectRepository(TelegramUser)
    private readonly userRepository: Repository<TelegramUser>,
    private readonly configService: ConfigService,
    private readonly telegramAppApiService: TelegramAppApiService,
  ) {
    this.webUrl = this.configService.get<string>('WEB_URL');
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    try {
      const user = ctx.from;
      const telegramUser = this.userRepository.create({
        id: user.id.toString(),
        is_bot: user.is_bot,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
      });
      await this.userRepository.save(telegramUser);

      const message = `Welcome ${user.first_name}`;
      const websiteUrlWithUsername = `${this.webUrl}?username=${user.first_name}`;
      const urlButton = Markup.button.url('Visit Website', websiteUrlWithUsername);

      const inlineKeyboard = Markup.inlineKeyboard([urlButton]);

      await ctx.reply(message, inlineKeyboard);
    } catch (error) {
      await ctx.reply('Sorry, an error occurred: ', error.message);
    }
  }
  @Command('adminhello')
  async adminHello(@Ctx() ctx: Context) {
    if ('text' in ctx.message) {
      const args = ctx.message.text.split(' ').slice(1);
      const telegramId = parseInt(args[0], 10);
      const text = args.slice(1).join(' ');

      const user = await this.userRepository.findOne({ where: { id: ctx.from.id.toString() } });

      if (user && user.is_admin) {
        try {
          await ctx.telegram.sendMessage(telegramId, text);
        } catch (error) {
          await ctx.reply(`Failed to send message: ${error.message}`);
        }
      } else {
        await ctx.reply('You are not authorized to use this command.');
      }
    } else {
      await ctx.reply('This command requires a text message.');
    }
  }
  // if (!user || !user.is_admin) {
  //   await ctx.reply('You are not authorized to use this command.');
  //   return;
  // }
  @Command('getuserid')
  async getUserId(@Ctx() ctx: Context) {
    const user = await this.userRepository.findOne({ where: { id: ctx.from.id.toString() } });
    if (!user || !user.is_admin) {
      await ctx.reply('You are not authorized to view this page');
      return;
    }
    if ('text' in ctx.message) {
      const args = ctx.message.text.split(' ').slice(1);
      const username = args[0];

      if (!username) {
        await ctx.reply('Please provide a username.');
        return;
      }
      try {
        const userId = await this.telegramAppApiService.getUserId(user.id, username);
        if (userId !== null) {
          await ctx.reply('User ID: ' + userId);
        } else {
          await ctx.reply('Error retrieving user information.');
        }
      } catch (error) {
        await ctx.reply('Error retrieving user information:' + error.message);
      }
    } else {
      await ctx.reply('This command requires a text message.');
    }
  }
  @Command('makeadmin')
  async makeUserAdmin(@Ctx() ctx: Context) {
    const adminUser = await this.userRepository.findOne({ where: { id: ctx.from.id.toString() } });
    if (!adminUser || !adminUser.is_admin) {
      await ctx.reply('You are not authorized to use this command.');
      return;
    }

    if ('text' in ctx.message) {
      const args = ctx.message.text.split(' ').slice(1);
      const adminId = args[0];

      if (!adminId) {
        await ctx.reply('Please provide an ID.');
        return;
      }

      let userToMakeAdmin = await this.userRepository.findOne({ where: { id: adminId } });

      if (!userToMakeAdmin) {
        try {
          userToMakeAdmin = this.userRepository.create({
            id: adminId,
            is_bot: false,
            first_name: '',
            last_name: '',
            username: '',
            language_code: '',
            is_premium: false,
            added_to_attachment_menu: false,
            is_admin: true,
          });
          await this.userRepository.save(userToMakeAdmin);
          await ctx.reply(`New user created and set as admin with ID: ${adminId}`);
        } catch (e) {
          await ctx.reply(`Error adding new user: ` + e.message);
        }
      } else {
        userToMakeAdmin.is_admin = true;
        await this.userRepository.save(userToMakeAdmin);
        await ctx.reply(`User with ID: ${adminId} is now an admin.`);
      }
    } else {
      await ctx.reply('This command requires a text message.');
    }
  }
}
