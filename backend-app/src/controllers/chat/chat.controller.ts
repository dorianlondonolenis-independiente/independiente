import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../../services/chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  @UseGuards(JwtAuthGuard)
  async query(@Body() body: { pregunta: string }) {
    return this.chatService.query(body.pregunta);
  }
}
