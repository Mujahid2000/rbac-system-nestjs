import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('dashboard')
export class DashboardController {
  @Get()
  @RequirePermission('view:dashboard')
  @ResponseMessage('Dashboard data fetched successfully.')
  getDashboard() {
    return {
      summary: {
        message: 'Dashboard endpoint is active.',
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
