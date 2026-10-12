import mongoose from 'mongoose';

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('he-IL', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, trim: true, maxlength: 160 },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  isSent: { type: Boolean, default: false },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  reminderDate: { type: Date, required: true },
  timezone: {
    type: String,
    default: 'UTC',
    validate: { validator: isValidTimeZone, message: 'Enter a valid IANA timezone' },
  },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

reminderSchema.index({ userId: 1, completed: 1, reminderDate: 1 });
reminderSchema.index({ isSent: 1, completed: 1, reminderDate: 1 });

export default mongoose.model('Reminder', reminderSchema);
