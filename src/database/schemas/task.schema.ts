import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const TASK_COLLECTION = 'tasks';

export type TaskDocument = HydratedDocument<Task>;

@Schema({ collection: TASK_COLLECTION, timestamps: true })
export class Task {
  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: false, default: null, trim: true })
  description!: string | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
