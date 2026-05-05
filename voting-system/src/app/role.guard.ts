import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth-service';
import { UserService } from './user-service';
import { map, catchError, of, tap } from 'rxjs';
import { UserRole } from './user';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
    // Returns a CanActivateFn — this outer function is a "guard factory"
    // that takes the allowed roles as configuration
    return (route: ActivatedRouteSnapshot) => {
        const authService = inject(AuthService);
        const userService = inject(UserService);
        const router = inject(Router);

        const checkRole = (user: any): boolean => {
            // Check if user has at least one of the required roles
            const hasRole = allowedRoles.some(role => user.role.includes(role));
            if (!hasRole) {
                router.navigate(['/']); // or wherever suits your app
            }
            return hasRole;
        };

        const user = authService.getUser();
        if (user) {
            // User already in memory — check role immediately
            return checkRole(user);
        }

        // Token exists but user not in memory — fetch first, then check role
        return userService.getMe().pipe(
            tap(fetchedUser => authService.setUser(fetchedUser)),
            map(fetchedUser => checkRole(fetchedUser)),
            catchError(() => {
                router.navigate(['/login']);
                return of(false);
            })
        );
    };
};