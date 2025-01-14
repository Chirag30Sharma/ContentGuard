// MessageInput.jsx
import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imagePreview) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      if (response.warnings?.length > 0) {
        response.warnings.forEach(warning => {
          const toastMessage = (
            <div>
              <p className="font-medium">{warning.message}</p>
              {warning.categories?.length > 0 && (
                <p className="text-sm mt-1">
                  Content flagged for: {warning.categories.join(', ')}
                </p>
              )}
            </div>
          );

          toast(toastMessage, {
            duration: 5000,
            icon: warning.severity === 'high' ? '🚫' : '⚠️',
            className: warning.severity === 'high' 
              ? '!bg-error/20 !text-error' 
              : '!bg-warning/20 !text-warning'
          });
        });
      }

      if (response.blocked) {
        toast.error("Message blocked due to inappropriate content", {
          duration: 5000,
          icon: '🚫'
        });
      }

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Failed to send message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-base-300"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center hover:bg-base-content/20 transition-colors"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
            disabled={isSubmitting}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md
              ${imagePreview ? "text-success" : "text-base-content/70"}
              ${isSubmitting ? "btn-disabled" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className={`btn btn-sm sm:btn-md btn-circle ${
            isSubmitting ? "btn-disabled" : ""
          }`}
          disabled={(!text.trim() && !imagePreview) || isSubmitting}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;