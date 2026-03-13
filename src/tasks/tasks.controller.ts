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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission('view:tasks')
  @ResponseMessage('Tasks fetched successfully.')
  listTasks() {
    return this.tasksService.list();
  }

  @Post()
  @RequirePermission('manage:tasks')
  @ResponseMessage('Task created successfully.')
  createTask(@Body() body: CreateTaskDto) {
    return this.tasksService.create(body);
  }

  @Patch(':id')
  @RequirePermission('manage:tasks')
  @ResponseMessage('Task updated successfully.')
  updateTask(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.tasksService.update(id, body);
  }

  @Delete(':id')
  @RequirePermission('manage:tasks')
  @ResponseMessage('Task deleted successfully.')
  deleteTask(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
