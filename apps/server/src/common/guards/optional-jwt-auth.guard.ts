import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Allows unauthenticated requests; attaches user when a valid JWT is present. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);
    if (result instanceof Observable) {
      return result.pipe(catchError(() => of(true)));
    }
    return Promise.resolve(result).catch(() => true);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
