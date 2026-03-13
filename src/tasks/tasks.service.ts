import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../database/schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
};

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async list(): Promise<TaskRecord[]> {
    const tasks = await this.taskModel.find().sort({ createdAt: -1 }).exec();
    return tasks.map((task) => this.toRecord(task));
  }

  async create(dto: CreateTaskDto): Promise<TaskRecord> {
    const created = await this.taskModel.create({
      title: dto.title,
      description: dto.description ?? null,
    });

    return this.toRecord(created);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskRecord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Task not found.');
    }

    const updated = await this.taskModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description }
              : {}),
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Task not found.');
    }

    return this.toRecord(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Task not found.');
    }

    const deleted = await this.taskModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Task not found.');
    }

    return { success: true };
  }

  private toRecord(task: TaskDocument): TaskRecord {
    return {
      id: task._id.toString(),
      title: task.title,
      description: task.description,
    };
  }
}
