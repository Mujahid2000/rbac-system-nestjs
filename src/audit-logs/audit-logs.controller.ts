import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermission('view:audit_log')
  @ResponseMessage('Audit logs fetched successfully.')
  listAuditLogs(@Query() query: GetAuditLogsQueryDto) {
    return this.auditLogsService.list(query.page ?? 1, query.limit ?? 50);
  }
}
