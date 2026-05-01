import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { BrandingService, Branding } from '../../services/branding/branding.service';
import { JwtAuthGuard } from '../../auth/jwt-auth/jwt-auth.guard';

@Controller('config/branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  /** GET /api/config/branding — público, sin autenticación */
  @Get()
  getBranding(): Branding {
    return this.brandingService.getBranding();
  }

  /** PUT /api/config/branding — solo admins autenticados */
  @Put()
  @UseGuards(JwtAuthGuard)
  updateBranding(@Body() body: Partial<Branding>): Branding {
    return this.brandingService.updateBranding(body);
  }
}
