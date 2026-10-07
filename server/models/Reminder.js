import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  reminderDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

reminderSchema.index({ userId: 1, completed: 1, reminderDate: 1 });

export default mongoose.model('Reminder', reminderSchema);
