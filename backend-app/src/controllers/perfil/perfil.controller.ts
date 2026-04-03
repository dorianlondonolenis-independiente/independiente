import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';

@Controller('perfil')
export class PerfilController {
  
  @UseGuards(JwtAuthGuard)
  @Get()
  getPerfil(@Request() req) {
    return req.user; // contiene id y username
  }
}
