import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('TelegramUser')
export class TelegramUser {
  @PrimaryColumn('bigint')
  id: number; // Renamed from id to telegramUserId

  @Column({ default: false })
  isAdmin: boolean; // Converted to camelCase

  @Column()
  isBot: boolean; // Converted to camelCase

  @Column()
  firstName: string; // Converted to camelCase

  @Column({ nullable: true })
  lastName?: string; // Converted to camelCase

  @Column({ nullable: true })
  userName?: string; // Remains the same as it's already in camelCase

  @Column({ nullable: true })
  languageCode?: string; // Converted to camelCase

  @Column({ nullable: true, default: false })
  isPremium?: boolean; // Converted to camelCase

  @Column({ nullable: true, default: false })
  addedToAttachmentMenu?: boolean; // Converted to camelCase

  @CreateDateColumn() // This will automatically set the current date and time
  createDate: Date;
}
