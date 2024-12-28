import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema({
  contentType: {
    type: String,
    enum: ['text', 'image'],
    required: true
  },
  content: String,
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  is_inappropriate: Boolean,
  confidence: Number,
  flagged_categories: [String],
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderatorNotes: String,
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;