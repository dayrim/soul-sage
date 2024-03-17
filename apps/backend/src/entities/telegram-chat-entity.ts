import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { TelegramMessage } from './telegram-message.entity';

@Entity('TelegramChat')
export class TelegramChat {
  @PrimaryColumn('bigint')
  id: number;

  @Column()
  type: string;

  @OneToMany(() => TelegramMessage, (message) => message.chat)
  messages: TelegramMessage[];

  @CreateDateColumn() // This will automatically set the current date and time
  createDate: Date;
}
