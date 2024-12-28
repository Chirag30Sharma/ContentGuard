import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  setMessages: (messages) => set({ messages }),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      // Get the current messages state before updating
      const currentMessages = [...get().messages];
      
      // Add new message while preserving previous messages
      if (res.data.message) {
        set({ messages: [...currentMessages, res.data.message] });
      }
  
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending message");
      throw error;
    }
  },
    
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
  
    socket.on("newMessage", (newMessage) => {
      const { messages, selectedUser } = get();
      const isMessageFromSelectedUser = 
        selectedUser && 
        (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id);
  
      if (isMessageFromSelectedUser) {
        // Create a new array while preserving existing messages
        const updatedMessages = [...messages];
        updatedMessages.push(newMessage);
        set({ messages: updatedMessages });
      }
    });
  
    socket.on("messageModerated", (moderatedMessage) => {
      const { messages } = get();
      // Create a new array while preserving message order
      const updatedMessages = messages.map(msg => 
        msg._id === moderatedMessage._id ? moderatedMessage : msg
      );
      set({ messages: updatedMessages });
    });
  },
  
    unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messageModerated");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));