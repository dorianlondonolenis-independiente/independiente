import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRol = 'admin' | 'user';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Username de inicio de sesión (ej. "admin@local"). */
  @Column({ unique: true })
  username!: string;

  /** Email del usuario. */
  @Column({ default: '' })
  email!: string;

  /** Nombre completo / display. */
  @Column({ default: '' })
  nombre!: string;

  /** Hash bcrypt. */
  @Column()
  passwordHash!: string;

  @Column({ type: 'varchar', default: 'user' })
  rol!: UserRol;

  @Column({ default: true })
  activo!: boolean;

  /** Marca al usuario como cliente de suscripción (SaaS). */
  @Column({ default: false })
  esSuscripcion!: boolean;

  /**
   * Fecha hasta la cual el usuario puede usar la herramienta cuando es de
   * suscripción. Null = sin expiración (on-premise).
   */
  @Column({ type: 'datetime', nullable: true })
  fechaExpiracion!: Date | null;

  /**
   * Lista de módulos permitidos. Se guarda como JSON.
   * El admin tiene `["*"]` (todos).
   */
  @Column({ type: 'simple-json', default: () => "'[]'" })
  modulosPermitidos!: string[];

  /**
   * Identificador único (jti) del token vigente. Si llega un request con un
   * jti distinto al guardado aquí, se rechaza (sesión única por usuario).
   */
  @Column({ type: 'varchar', nullable: true })
  currentTokenJti!: string | null;

  /**
   * Última fecha vista por el sistema. Se usa para detectar manipulación de
   * reloj cuando el usuario es de suscripción.
   */
  @Column({ type: 'datetime', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
