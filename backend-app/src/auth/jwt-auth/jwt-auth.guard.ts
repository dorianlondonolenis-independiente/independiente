import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
// export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Puedes agregar lógica adicional aquí antes de continuar con el proceso de autenticación
    console.log('Verificando JWT...');

    return super.canActivate(context); // Llama al método original de Passport
  }
}
