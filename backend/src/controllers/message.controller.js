import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ModerationLog from "../models/moderation.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import axios from "axios";
import { get } from "mongoose";

const MODERATION_API_URL = "http://localhost:5002/api/moderate";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId }
      ]
    });

    // Filter messages based on who's requesting them
    const filteredMessages = messages.map(message => {
      // If user is the sender, show full message with warnings
      if (message.senderId.toString() === myId.toString()) {
        return message;
      }
      
      // If user is the receiver, hide blocked messages
      if (message.blocked) {
        return null;
      }
      
      // Return clean version of message for receiver
      return {
        _id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: message.text,
        image: message.image,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      };
    }).filter(message => message !== null);

    res.status(200).json(filteredMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let moderationWarnings = [];
    let shouldBlock = false;
    let imageUrl;

    // Content moderation for text
    if (text) {
      try {
        const textModerationResponse = await axios.post(MODERATION_API_URL, {
          type: 'text',
          content: text
        });
        const textModeration = textModerationResponse.data;

        if (textModeration.is_inappropriate) {
          await new ModerationLog({
            contentType: 'text',
            content: text,
            senderId,
            receiverId,
            ...textModeration
          }).save();

          moderationWarnings.push({
            type: 'text',
            message: 'Your message contains inappropriate language',
            categories: textModeration.flagged_categories,
            severity: textModeration.confidence > 0.9 ? 'high' : 'medium'
          });

          if (textModeration.confidence > 0.9) {
            shouldBlock = true;
          }
        }
      } catch (error) {
        console.error("Text moderation failed:", error);
        return res.status(500).json({ error: "Content moderation service unavailable" });
      }
    }

    // Content moderation and upload for image
    if (image && !shouldBlock) {
      try {
        const imageModerationResponse = await axios.post(MODERATION_API_URL, {
          type: 'image',
          content: image
        });
        const imageModeration = imageModerationResponse.data;

        if (imageModeration.is_inappropriate) {
          await new ModerationLog({
            contentType: 'image',
            senderId,
            receiverId,
            ...imageModeration
          }).save();

          moderationWarnings.push({
            type: 'image',
            message: 'Image contains inappropriate content',
            categories: imageModeration.flagged_categories,
            severity: imageModeration.confidence > 0.9 ? 'high' : 'medium'
          });

          if (imageModeration.confidence > 0.9) {
            shouldBlock = true;
          }
        }

        if (!shouldBlock) {
          const uploadResponse = await cloudinary.uploader.upload(image);
          imageUrl = uploadResponse.secure_url;
        }
      } catch (error) {
        console.error("Image moderation or upload failed:", error);
        return res.status(500).json({ error: "Failed to process image" });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      flagged: moderationWarnings.length > 0,
      moderationWarnings,
      blocked: shouldBlock
    });

    await newMessage.save();

    // Emit moderation result to sender immediately
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageModerated", newMessage);
    }

    // Only send to receiver if not blocked
    if (!shouldBlock) {
      const receiverMessage = {
        _id: newMessage._id,
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        text: newMessage.text,
        image: newMessage.image,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt
      };

      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", receiverMessage);
      }
    }

    res.status(201).json({
      message: newMessage,
      warnings: moderationWarnings,
      blocked: shouldBlock
    });
  } catch (error) {
    console.error("Error in sendMessage controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getModerationStats = async (req, res) => {
  try {
    const stats = await ModerationLog.aggregate([
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          flaggedContent: {
            $sum: { $cond: ["$is_inappropriate", 1, 0] }
          },
          textChecks: {
            $sum: { $cond: [{ $eq: ["$contentType", "text"] }, 1, 0] }
          },
          imageChecks: {
            $sum: { $cond: [{ $eq: ["$contentType", "image"] }, 1, 0] }
          }
        }
      }
    ]);

    const categoryStats = await ModerationLog.aggregate([
      { $unwind: "$flaggedCategories" },
      {
        $group: {
          _id: "$flaggedCategories",
          count: { $sum: 1 }
        }
      }
    ]);

    const response = stats[0] || {
      totalChecks: 0,
      flaggedContent: 0,
      textChecks: 0,
      imageChecks: 0
    };

    response.categories = categoryStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting moderation stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


export default { getUsersForSidebar, getMessages, sendMessage, getModerationStats };