// src/entities/telegramSession.entity.ts

import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('TelegramSession')
export class TelegramSession {
  @PrimaryColumn()
  id: string; // A unique identifier for the session

  @Column('text')
  sessionData: string; // The session data

  @CreateDateColumn() // This will automatically set the current date and time
  createDate: Date;
}
