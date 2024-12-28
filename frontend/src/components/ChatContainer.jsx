// ChatContainer.jsx
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { AlertTriangle, Ban } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const lastMessageRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={idx === messages.length - 1 ? lastMessageRef : null}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>

            <div 
              className={`chat-bubble flex flex-col relative 
                ${message.flagged ? 'border border-warning' : ''}
                ${message.blocked ? 'bg-error/10 border border-error' : ''}`}
            >
              {message.senderId === authUser._id && message.flagged && !message.blocked && (
                <div className="absolute -top-3 -left-1">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
              )}
              
              {message.senderId === authUser._id && message.blocked && (
                <div className="absolute -top-3 -left-1">
                  <Ban className="w-5 h-5 text-error" />
                </div>
              )}

              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              
              {message.text && <p>{message.text}</p>}

              {message.senderId === authUser._id && message.moderationWarnings?.map((warning, idx) => (
                <div
                  key={idx}
                  className={`mt-2 p-2 rounded-md text-xs font-medium
                    ${warning.severity === 'high' 
                      ? 'bg-error/20 text-error' 
                      : 'bg-warning/20 text-warning'}`}
                >
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{warning.message}</span>
                  </div>
                  {warning.categories?.length > 0 && (
                    <p className="mt-1 text-xs opacity-90">
                      Flagged for: {warning.categories.join(', ')}
                    </p>
                  )}
                </div>
              ))}

              {message.blocked && message.senderId === authUser._id && (
                <div className="mt-2 p-2 bg-error/20 text-error rounded-md text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <Ban className="w-4 h-4" />
                    <span>Message blocked due to inappropriate content</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;