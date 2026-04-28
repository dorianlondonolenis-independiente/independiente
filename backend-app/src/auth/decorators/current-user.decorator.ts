import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../entities/user.entity';

/** Inyecta el usuario autenticado en el handler. */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as User | undefined;
    return data && user ? user[data] : user;
  },
);
