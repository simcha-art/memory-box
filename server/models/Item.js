import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', trim: true, maxlength: 10000 },
  type: { type: String, enum: ['Document', 'Receipt', 'Note', 'Link', 'Image'], required: true },
  category: { type: String, default: '', trim: true, maxlength: 80 },
  tags: { type: [String], default: [] },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  storageName: { type: String, default: '', select: false },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

itemSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('Item', itemSchema);
