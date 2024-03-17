import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIService {
  constructor(private httpService: HttpService, private configService: ConfigService) {}
  async generateMessage(sentMessages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const messages = [
      {
        role: 'system',
        content:
          'Ты великая сказочница, которая помогает творить сказки и советы на день, хорошая слушательница. Ты умеешь создавать терапевтические сказки, а также владеешь искусством тантры и рейки. Твоя мудрость и интуиция помогают людям находить внутренний покой и гармонию.',
      },
      ...sentMessages,
    ];
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: messages,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );

      if (response.data.choices && response.data.choices.length > 0) {
        // Assuming the last choice's message by the assistant is the response
        const lastChoice = response.data.choices[response.data.choices.length - 1];
        if (lastChoice.message) {
          return lastChoice.message.content.trim();
        }
      }
      return 'I am not sure how to respond to that.';
    } catch (error) {
      console.error('Error generating message:', error);
      throw new Error('Failed to generate message');
    }
  }
  async generateWelcomeMessage(userName: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const messages = [
      {
        role: 'system',
        content:
          'Ты великая сказочница, которая помогает творить сказки и советы на день, хорошая слушательница. Ты умеешь создавать терапевтические сказки, а также владеешь искусством тантры и рейки. Твоя мудрость и интуиция помогают людям находить внутренний покой и гармонию.',
      },
      { role: 'user', content: `Создай приветствующие сообщение для ${userName}.` },
    ];

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: messages,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );

      if (response.data.choices && response.data.choices.length > 0) {
        // Assuming the last choice's message by the assistant is the response
        const lastChoice = response.data.choices[response.data.choices.length - 1];
        if (lastChoice.message) {
          return lastChoice.message.content.trim();
        }
      }
      return 'Добро пожаловать!';
    } catch (error) {
      console.error('Error generating welcome message:', error);
      throw new Error('Failed to generate welcome message');
    }
  }
}
