import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ApplyLicenseDto {
  @IsUUID()
  userId!: string;

  /** Key completa: `payloadBase64Url.signatureBase64Url` */
  @IsString()
  @IsNotEmpty()
  key!: string;
}
