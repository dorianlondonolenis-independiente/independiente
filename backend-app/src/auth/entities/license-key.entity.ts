import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registro de cada key de licencia aplicada en este servidor.
 * Sirve para evitar reutilización de la misma key.
 */
@Entity({ name: 'license_keys' })
export class LicenseKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** keyId interno emitido por el generador (UUID dentro del payload firmado). */
  @Column({ unique: true })
  @Index()
  keyId!: string;

  /** Usuario al que se aplicó la key. */
  @Column()
  userId!: string;

  /** Email/username dentro del payload, registrado para auditoría. */
  @Column({ default: '' })
  username!: string;

  /** Fecha de expiración de la suscripción que otorga la key. */
  @Column({ type: 'datetime' })
  expiresAt!: Date;

  /** Fecha en que se emitió la key. */
  @Column({ type: 'datetime' })
  issuedAt!: Date;

  /** Cadena completa aplicada (payload.signature). */
  @Column({ type: 'text' })
  rawKey!: string;

  @CreateDateColumn()
  appliedAt!: Date;
}
