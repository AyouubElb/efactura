import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../generated/prisma/client.js';
import type { AuthenticatedRequest } from '../auth/auth-user.js';
import { ROLES } from '../decorators/roles.decorator.js';

// Runs after AuthGuard; routes without @Roles are open to every logged-in person
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'ADMIN_ONLY',
        message: "Action réservée à l'administrateur",
      });
    }
    return true;
  }
}
