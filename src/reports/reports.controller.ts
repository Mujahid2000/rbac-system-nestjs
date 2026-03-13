import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('reports')
export class ReportsController {
  @Get()
  @RequirePermission('view:reports')
  @ResponseMessage('Reports fetched successfully.')
  getReports() {
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        message: 'Reports endpoint is active.',
      },
    };
  }
}
