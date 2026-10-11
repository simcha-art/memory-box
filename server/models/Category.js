import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  // Fixed categories that every user gets; they cannot be renamed or deleted.
  isDefault: { type: Boolean, default: false },
  // Display order of the fixed categories (custom ones keep 0 and sort by name).
  order: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);