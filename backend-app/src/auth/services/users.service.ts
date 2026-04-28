import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { User } from '../entities/user.entity';

/**
 * Username y password del administrador maestro. NO se permite cambiarlo desde
 * la UI; siempre vive con estas credenciales.
 */
export const ADMIN_USERNAME = 'admin@local';
export const ADMIN_EMAIL = 'dorian.315@hotmail.com';
export const ADMIN_PASSWORD = 'r3@W&G7NY36DYA6QA563Xt';
const BCRYPT_COST = 12;

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User, 'auth')
    private readonly repo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.ensureAdmin();
  }

  /**
   * Si el admin no existe lo crea con la password hardcodeada. Si ya existe,
   * fuerza siempre la password actual y los privilegios totales (no se permite
   * "perder" al admin por una mutación accidental en BD).
   */
  private async ensureAdmin() {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
    const existing = await this.repo.findOne({ where: { username: ADMIN_USERNAME } });
    if (!existing) {
      await this.repo.save(
        this.repo.create({
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          nombre: 'Administrador',
          passwordHash: hash,
          rol: 'admin',
          activo: true,
          esSuscripcion: false,
          fechaExpiracion: null,
          modulosPermitidos: ['*'],
        }),
      );
      this.logger.log(`Admin creado: ${ADMIN_USERNAME}`);
      return;
    }
    // Reforzar credenciales/privilegios del admin en cada arranque.
    existing.email = ADMIN_EMAIL;
    existing.passwordHash = hash;
    existing.rol = 'admin';
    existing.activo = true;
    existing.modulosPermitidos = ['*'];
    existing.esSuscripcion = false;
    existing.fechaExpiracion = null;
    await this.repo.save(existing);
  }

  findByUsername(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    if (dto.username === ADMIN_USERNAME) {
      throw new ConflictException('El username "admin@local" está reservado.');
    }
    const existing = await this.repo.findOne({ where: { username: dto.username } });
    if (existing) throw new ConflictException('El username ya existe.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    // Sólo existe un admin (el maestro hardcodeado). Cualquier usuario creado
    // desde la UI siempre se fuerza a rol 'user'.
    const entity = this.repo.create({
      username: dto.username,
      email: dto.email ?? '',
      nombre: dto.nombre ?? '',
      passwordHash,
      rol: 'user',
      activo: dto.activo ?? true,
      esSuscripcion: dto.esSuscripcion ?? false,
      fechaExpiracion: dto.fechaExpiracion ? new Date(dto.fechaExpiracion) : null,
      modulosPermitidos: dto.modulosPermitidos ?? [],
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.username === ADMIN_USERNAME) {
      // El admin no se puede modificar; sus credenciales son inmutables.
      throw new ConflictException('El admin maestro no puede modificarse.');
    }

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.nombre !== undefined) user.nombre = dto.nombre;
    // El rol nunca se cambia desde la UI: el único admin es el maestro.
    if (dto.activo !== undefined) user.activo = dto.activo;
    if (dto.esSuscripcion !== undefined) user.esSuscripcion = dto.esSuscripcion;
    if (dto.fechaExpiracion !== undefined) {
      user.fechaExpiracion = dto.fechaExpiracion ? new Date(dto.fechaExpiracion) : null;
    }
    if (dto.modulosPermitidos !== undefined) user.modulosPermitidos = dto.modulosPermitidos;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.username === ADMIN_USERNAME) {
      throw new ConflictException('El admin maestro no puede eliminarse.');
    }
    await this.repo.delete(id);
  }

  async setCurrentTokenJti(id: string, jti: string | null) {
    await this.repo.update(id, { currentTokenJti: jti, lastLoginAt: jti ? new Date() : undefined });
  }

  async touchLastSeen(id: string, fecha: Date) {
    await this.repo.update(id, { lastSeenAt: fecha });
  }

  async setExpiracion(id: string, fechaExpiracion: Date) {
    await this.repo.update(id, { fechaExpiracion });
  }

  /** Quita el password antes de exponerlo al frontend. */
  toPublic(u: User) {
    const { passwordHash, currentTokenJti, ...rest } = u;
    return rest;
  }
}
