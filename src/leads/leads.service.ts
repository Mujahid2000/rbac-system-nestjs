import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../database/schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

type LeadRecord = {
  id: string;
  name: string;
  email: string | null;
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
  ) {}

  async list(): Promise<LeadRecord[]> {
    const leads = await this.leadModel.find().sort({ createdAt: -1 }).exec();
    return leads.map((lead) => this.toRecord(lead));
  }

  async create(dto: CreateLeadDto): Promise<LeadRecord> {
    const created = await this.leadModel.create({
      name: dto.name,
      email: dto.email ?? null,
    });

    return this.toRecord(created);
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadRecord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Lead not found.');
    }

    const updated = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.email !== undefined ? { email: dto.email } : {}),
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Lead not found.');
    }

    return this.toRecord(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Lead not found.');
    }

    const deleted = await this.leadModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Lead not found.');
    }

    return { success: true };
  }

  private toRecord(lead: LeadDocument): LeadRecord {
    return {
      id: lead._id.toString(),
      name: lead.name,
      email: lead.email,
    };
  }
}
