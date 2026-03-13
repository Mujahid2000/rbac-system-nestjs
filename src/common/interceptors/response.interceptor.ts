import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

type SuccessApiResponse<T> = {
  status: 'success';
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
};

type ExistingEnvelope = {
  status: string;
  message: string;
  data: unknown;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessApiResponse<T> | ExistingEnvelope
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessApiResponse<T> | ExistingEnvelope> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle() as Observable<
        SuccessApiResponse<T> | ExistingEnvelope
      >;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
    }>();
    const response = http.getResponse<{ statusCode: number }>();
    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data: T | ExistingEnvelope) => {
        if (this.isExistingEnvelope(data)) {
          return data;
        }

        const statusCode = response.statusCode;

        return {
          status: 'success',
          statusCode,
          message:
            customMessage ?? this.buildMessage(request.method, statusCode),
          data,
          timestamp: new Date().toISOString(),
          path: request.originalUrl ?? request.url,
        };
      }),
    );
  }

  private buildMessage(method: string, statusCode: number): string {
    if (statusCode === 201) {
      return 'Resource created successfully.';
    }

    if (statusCode === 204) {
      return 'Request completed successfully.';
    }

    switch (method.toUpperCase()) {
      case 'GET':
        return 'Data fetched successfully.';
      case 'POST':
        return 'Request processed successfully.';
      case 'PUT':
      case 'PATCH':
        return 'Resource updated successfully.';
      case 'DELETE':
        return 'Resource deleted successfully.';
      default:
        return 'Request completed successfully.';
    }
  }

  private isExistingEnvelope(value: unknown): value is ExistingEnvelope {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return (
      'status' in value &&
      'message' in value &&
      'data' in value &&
      typeof (value as { status?: unknown }).status === 'string' &&
      typeof (value as { message?: unknown }).message === 'string'
    );
  }
}
