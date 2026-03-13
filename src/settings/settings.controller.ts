import { Body, Controller, Get, Patch } from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  private settingsState = {
    timezone: 'UTC',
    locale: 'en-US',
    updatedAt: new Date().toISOString(),
  };

  @Get()
  @RequirePermission('view:settings')
  @ResponseMessage('Settings fetched successfully.')
  getSettings() {
    return this.settingsState;
  }

  @Patch()
  @RequirePermission('manage:settings')
  @ResponseMessage('Settings updated successfully.')
  updateSettings(@Body() body: UpdateSettingsDto) {
    this.settingsState = {
      ...this.settingsState,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return this.settingsState;
  }
}
