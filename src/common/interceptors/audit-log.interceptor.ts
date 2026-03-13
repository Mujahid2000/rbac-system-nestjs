import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Observable, tap } from 'rxjs';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import { AuthenticatedRequest } from '../../authorization/types/authenticated-request.type';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();

    const method = request.method.toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!isStateChanging) {
      return next.handle();
    }

    const actorUserId = request.auth?.userId;
    if (!actorUserId || !Types.ObjectId.isValid(actorUserId)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const route = request.route as { path?: string } | undefined;
        const routePath = route?.path ?? request.path;
        const action = `${method.toLowerCase()}.${routePath}`;
        const targetIdRaw = request.params?.id;
        const targetId =
          typeof targetIdRaw === 'string' && Types.ObjectId.isValid(targetIdRaw)
            ? new Types.ObjectId(targetIdRaw)
            : null;

        void this.auditLogModel.create({
          actorId: new Types.ObjectId(actorUserId),
          action,
          targetId,
          metadata: {
            method,
            path: request.path,
            params: request.params,
            query: request.query,
            body: request.body,
            statusCode: response.statusCode,
          },
          createdAt: new Date(),
        });
      }),
    );
  }
}
