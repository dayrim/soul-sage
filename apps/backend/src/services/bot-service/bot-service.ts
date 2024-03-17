import { Update, Ctx, Start, Command, On, Use, Next, InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { TelegramUser } from '../../entities/telegram-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TelegramAppApiService } from '../telegram-app-api/telegram-app-api.service';
import { Logger } from '@nestjs/common'; // Import Logger
import { TelegramMessage } from 'src/entities/telegram-message.entity';
import { TelegramChat } from 'src/entities/telegram-chat-entity';
import { ExtendedRepository } from 'src/shared/generic-repository';
import { OpenAIService } from '../openai/openai.service';
@Update()
export class BotService {
  private readonly webUrl: string;
  private readonly logger = new Logger(BotService.name); // Instantiate Logger with context
  private botUser: TelegramUser | null = null; // This will hold the bot user info

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    @InjectRepository(TelegramUser)
    private readonly userRepository: ExtendedRepository<TelegramUser>,
    @InjectRepository(TelegramMessage)
    private readonly messageRepository: Repository<TelegramMessage>,
    @InjectRepository(TelegramChat) // Inject the TelegramChat repository
    private readonly chatRepository: ExtendedRepository<TelegramChat>,
    private readonly configService: ConfigService,
    private readonly telegramAppApiService: TelegramAppApiService,
    private readonly openAiService: OpenAIService,
  ) {
    this.webUrl = this.configService.get<string>('WEB_URL');
  }
  async onModuleInit() {
    const me = await this.bot.telegram.getMe();
    // Save the bot user to database if it doesn't exist

    const userData = {
      id: me.id,
      isBot: me.is_bot,
      firstName: me.first_name,
      userName: me.username,
    };
    const user = await this.userRepository.findOrCreate({ id: me.id }, userData);
    // Save the bot user information in the service instance for later use
    this.botUser = user;
  }

  // Example method to get bot user info
  getBotUserInfo(): TelegramUser | null {
    return this.botUser;
  }
  @Use()
  async onUpdate(@Ctx() ctx: Context, @Next() next) {
    this.logger.debug('Received a message update.');
    try {
      if ('text' in ctx.message) {
        const msg = ctx.message;
        this.logger.debug(`Processing text message: ${msg.text}`);

        if (!msg) {
          this.logger.warn('Message object is undefined or null.');
          return;
        }

        const chat = await this.chatRepository.findOrCreate(
          { id: msg.chat.id },
          {
            id: msg.chat.id,
            type: msg.chat.type,
          },
        );
        // Handle user (from)
        let user = null;
        if (msg.from) {
          user = await this.userRepository.findOrCreate(
            { id: msg.from.id },
            {
              id: msg.from.id,
              isBot: msg.from.is_bot,
              firstName: msg.from.first_name,
              lastName: msg.from.last_name,
              userName: msg.from.username,
              languageCode: msg.from.language_code,
            },
          );
        }

        // Handle sender chat (if present)
        let senderChat = null;
        if (msg.sender_chat) {
          senderChat = await this.chatRepository.findOrCreate(
            { id: msg.sender_chat.id },
            {
              id: msg.sender_chat.id,
              type: msg.sender_chat.type,
            },
          );
        }

        const telegramMessage = this.messageRepository.create({
          messageId: msg.message_id,
          chat: chat,
          from: user,
          senderChat: senderChat,
          date: msg.date,
          text: msg.text,
          messageThreadId: msg.message_thread_id,
        });

        await this.messageRepository.save(telegramMessage);
        this.logger.log(`Message saved: ${msg.text}`);

        if (!msg.text.startsWith('/start')) {
          // Check if it's not a bot command
          // Fetch message history excluding bot commands
          const messageHistory = await this.messageRepository.find({
            where: { chat: chat },
            order: { date: 'DESC' },
            take: 10, // Adjust based on how many messages you want to include as context
          });

          // Prepare messages for OpenAI
          const messagesForOpenAI = messageHistory.map((message) => ({
            role: message.from === this.botUser ? 'assistant' : 'user',
            content: message.text,
          }));

          // Add the current message to the end
          messagesForOpenAI.push({ role: 'user', content: msg.text });

          // Get response from OpenAI
          const responseMessage = await this.openAiService.generateMessage(messagesForOpenAI);

          // Send the response back to the user
          const newMessage = await ctx.reply(responseMessage);
          // Save the sent message details
          const telegramMessage = this.messageRepository.create({
            messageId: newMessage.message_id,
            chat: chat,
            from: this.botUser, // The bot user as the sender
            senderChat: null, // Adjust based on your model
            date: newMessage.date,
            text: newMessage.text,
            replyMarkup: JSON.stringify(newMessage.reply_markup), // Stringify the reply_markup
          });
          await this.messageRepository.save(telegramMessage);
          this.logger.log(`Message saved: ${telegramMessage.text}`);
        }
      } else {
        this.logger.debug('Received a non-text message, skipping save.');
      }

      next();
    } catch (error) {
      this.logger.error(`Error in message handling: ${error.message}`, { error: error.stack });
      next();
    }
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    this.logger.log('Starting bot session'); // Log starting of bot session

    try {
      const user = ctx.from;
      const messageText = await this.openAiService.generateWelcomeMessage(user.first_name);
      const websiteUrlWithUsername = `${this.webUrl}?username=${user.first_name}`;
      const urlButton = Markup.button.url('Visit Website', websiteUrlWithUsername);
      const inlineKeyboard = Markup.inlineKeyboard([urlButton]);
      const sentMessage = await ctx.reply(messageText);

      // Fetch or create chat and bot user (assuming bot user is already saved in the db)
      const chat = await this.chatRepository.findOrCreate(
        { id: ctx.chat.id },
        {
          id: ctx.chat.id,
          type: ctx.chat.type,
        },
      );
      // Save the sent message details
      const telegramMessage = this.messageRepository.create({
        messageId: sentMessage.message_id,
        chat: chat,
        from: this.botUser, // The bot user as the sender
        senderChat: null, // Adjust based on your model
        date: sentMessage.date,
        text: messageText,
        replyMarkup: JSON.stringify(sentMessage.reply_markup), // Stringify the reply_markup
      });

      await this.messageRepository.save(telegramMessage);
      this.logger.log(`Message saved: ${messageText}`);
    } catch (error) {
      this.logger.error('Error in start command', error.stack); // Log error with stack trace
      await ctx.reply('Sorry, an error occurred: ' + error.message);
    }
  }

  async sendMessageAndLog(userId: number, chatId: number, text: string) {
    try {
      // Send a message using Telegram's API (through your bot)
      const sentMessage = await this.telegramAppApiService.sendMessage(chatId, text);
    } catch (error) {
      this.logger.error(`Error sending or logging message: ${error.message}`, { error: error.stack });
    }
  }

  @Command('adminhello')
  async adminHello(@Ctx() ctx: Context) {
    if ('text' in ctx.message) {
      const args = ctx.message.text.split(' ').slice(1);
      const telegramId = parseInt(args[0], 10);
      const text = args.slice(1).join(' ');

      const user = await this.userRepository.findOne({ where: { id: ctx.from.id } });

      if (user && user.isAdmin) {
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
  @Command('getuserid')
  async getUserId(@Ctx() ctx: Context) {
    const user = await this.userRepository.findOne({ where: { id: ctx.from.id } });
    if (!user || !user.isAdmin) {
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
        const userId = await this.telegramAppApiService.getUserId(username);
        if (userId !== null) {
          await ctx.reply('User ID: ' + userId);
        } else {
          await ctx.reply('Error retrieving user information.');
        }
      } catch (error) {
        this.logger.error(`Error in adminHello command: ${error.message}`, error.stack);

        await ctx.reply('Error retrieving user information:' + error.message);
      }
    } else {
      await ctx.reply('This command requires a text message.');
    }
  }
  @Command('makeadmin')
  async makeUserAdmin(@Ctx() ctx: Context) {
    const adminUser = await this.userRepository.findOne({ where: { id: ctx.from.id } });
    if (!adminUser || !adminUser.isAdmin) {
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

      let userToMakeAdmin = await this.userRepository.findOne({ where: { id: Number(adminId) } });

      if (!userToMakeAdmin) {
        try {
          userToMakeAdmin = this.userRepository.create({
            id: Number(adminId),
            isBot: false,
            firstName: '',
            lastName: '',
            userName: '',
            languageCode: '',
            isPremium: false,
            addedToAttachmentMenu: false,
            isAdmin: true,
          });
          await this.userRepository.save(userToMakeAdmin);
          await ctx.reply(`New user created and set as admin with ID: ${adminId}`);
        } catch (e) {
          await ctx.reply(`Error adding new user: ` + e.message);
        }
      } else {
        userToMakeAdmin.isAdmin = true;
        await this.userRepository.save(userToMakeAdmin);
        await ctx.reply(`User with ID: ${adminId} is now an admin.`);
      }
    } else {
      await ctx.reply('This command requires a text message.');
    }
  }
}
