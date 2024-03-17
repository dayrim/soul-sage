import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { TelegramChat } from './telegram-chat-entity';
import { TelegramUser } from './telegram-user.entity';

@Entity('TelegramMessage')
export class TelegramMessage {
  @PrimaryColumn() // Use PrimaryColumn instead of PrimaryGeneratedColumn
  messageId: number;

  @PrimaryColumn() // Add PrimaryColumn for chatId
  chatId: number; // This assumes you're storing the chat ID as a separate column

  @Column({ nullable: true })
  messageThreadId?: number;

  @ManyToOne(() => TelegramUser, { nullable: true })
  @JoinColumn({ name: 'fromUserId' })
  from?: TelegramUser;

  @ManyToOne(() => TelegramChat, { nullable: true })
  @JoinColumn({ name: 'senderChatId' })
  senderChat?: TelegramChat;

  @Column('bigint')
  date: number;

  @CreateDateColumn() // This will automatically set the current date and time
  createDate: Date;

  @ManyToOne(() => TelegramChat)
  @JoinColumn({ name: 'chatId', referencedColumnName: 'id' }) // Ensure this matches the chat entity's ID field
  chat: TelegramChat;

  @Column({ nullable: true, default: false })
  isTopicMessage?: boolean;

  @Column({ nullable: true, type: 'text' })
  text?: string;

  @Column({ nullable: true, type: 'text' })
  replyMarkup?: string;
}
