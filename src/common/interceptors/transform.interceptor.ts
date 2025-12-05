import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // return next.handle().pipe(map(data => data))
    // console.log('Interceptors1');
    return next.handle().pipe(
      map((data) => {
        // console.log('Interceptors 2', data);
        return {
          data,
          code: 0,
          success: true,
          ts: Date.now(),
        };
      }),
    );
  }
}
