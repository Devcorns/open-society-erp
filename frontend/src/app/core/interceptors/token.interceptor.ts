import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const tokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);

  const addToken = (request: HttpRequest<unknown>, token: string) =>
    request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const token = auth.accessToken();

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);

      // Skip refresh for auth endpoints to avoid loops
      if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
        auth.logout();
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshTokenSubject.pipe(
          filter((t) => t !== null),
          take(1),
          switchMap((newToken) => next(addToken(req, newToken!)))
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return auth.refresh().pipe(
        switchMap((newToken: string) => {
          isRefreshing = false;
          refreshTokenSubject.next(newToken);
          return next(addToken(req, newToken));
        }),
        catchError((refreshErr) => {
          isRefreshing = false;
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
