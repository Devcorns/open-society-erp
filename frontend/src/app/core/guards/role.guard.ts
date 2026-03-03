import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] ?? [];
  if (!requiredRoles.length) return true;

  const role = auth.userRole();
  if (role && requiredRoles.includes(role)) return true;

  router.navigate(['/dashboard']);
  return false;
};
