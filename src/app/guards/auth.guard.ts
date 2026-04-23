import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { switchMap, take, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.userReady$.pipe(
    take(1),
    switchMap(() => auth.user$.pipe(take(1))),
    map(user => user ? true : router.createUrlTree(['/login']))
  );
};
