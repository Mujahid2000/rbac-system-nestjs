import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const LEAD_COLLECTION = 'leads';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ collection: LEAD_COLLECTION, timestamps: true })
export class Lead {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  email!: string | null;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
