import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class TelegramUser {
  @PrimaryColumn('bigint')
  id: string;

  @Column({ default: false })
  is_admin: boolean;

  @Column()
  is_bot: boolean;

  @Column()
  first_name: string;

  @Column({ nullable: true })
  last_name?: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  language_code?: string;

  @Column({ nullable: true, default: false })
  is_premium?: boolean;

  @Column({ nullable: true, default: false })
  added_to_attachment_menu?: boolean;
}
