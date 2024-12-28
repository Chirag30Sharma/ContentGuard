import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    flagged: {
      type: Boolean,
      default: false
    },
    moderationWarnings: [{
      type: {
        type: String,
        enum: ['text', 'image']
      },
      message: String,
      categories: [String],
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    blocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
