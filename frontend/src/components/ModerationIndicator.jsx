import { AlertCircle } from "lucide-react";

const ModerationIndicator = ({ status }) => {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-red-100 rounded-lg">
      <AlertCircle className="text-red-500" size={16} />
      <div className="text-sm text-red-700">
        <p className="font-medium">Content Warning</p>
        <p>Flagged categories: {status.categories.join(", ")}</p>
      </div>
    </div>
  );
};

export default ModerationIndicator;