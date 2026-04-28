import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { ApplyLicenseDto } from '../dtos/apply-license.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { LicenseService } from '../services/license.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('license')
export class LicenseController {
  constructor(private readonly license: LicenseService) {}

  @Post('apply')
  async apply(@Body() dto: ApplyLicenseDto) {
    return this.license.aplicar(dto.userId, dto.key);
  }

  @Get('history/:userId')
  async historial(@Param('userId') userId: string) {
    return this.license.historial(userId);
  }
}
