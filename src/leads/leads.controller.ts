import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission('view:leads')
  @ResponseMessage('Leads fetched successfully.')
  listLeads() {
    return this.leadsService.list();
  }

  @Post()
  @RequirePermission('manage:leads')
  @ResponseMessage('Lead created successfully.')
  createLead(@Body() body: CreateLeadDto) {
    return this.leadsService.create(body);
  }

  @Patch(':id')
  @RequirePermission('manage:leads')
  @ResponseMessage('Lead updated successfully.')
  updateLead(@Param('id') id: string, @Body() body: UpdateLeadDto) {
    return this.leadsService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('manage:leads')
  @ResponseMessage('Lead deleted successfully.')
  deleteLead(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
