import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('customer-portal')
export class CustomerPortalController {
  @Get()
  @RequirePermission('view:customer_portal')
  @ResponseMessage('Customer portal data fetched successfully.')
  getCustomerPortal() {
    return {
      message: 'Customer portal endpoint is active.',
      generatedAt: new Date().toISOString(),
    };
  }
}
