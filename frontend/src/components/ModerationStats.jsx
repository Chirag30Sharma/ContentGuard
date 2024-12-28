import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";

const ModerationStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get("/messages/moderation-stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch moderation stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-4">Loading statistics...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Content Moderation Statistics</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Total Checks</div>
          <div className="stat-value">{stats.totalChecks}</div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Flagged Content</div>
          <div className="stat-value text-error">{stats.flaggedContent}</div>
        </div>

        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Text Checks</div>
          <div className="stat-value">{stats.textChecks}</div>
        </div>

        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Image Checks</div>
          <div className="stat-value">{stats.imageChecks}</div>
        </div>
      </div>

      {stats.categories && Object.keys(stats.categories).length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-medium mb-3">Flagged Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(stats.categories).map(([category, count]) => (
              <div key={category} className="bg-base-200 rounded-lg p-3">
                <div className="text-sm font-medium">{category}</div>
                <div className="text-lg">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationStats;