import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from '../database/schemas/audit-log.schema';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async list(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments().exec(),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }
}
