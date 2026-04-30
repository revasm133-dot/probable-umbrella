import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "/api";

export default function ProgressTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await axios.get(`${API}/progress`).catch(() => ({ data: [] }));

      // ✅ FIX: pastikan selalu array
      const safeData = Array.isArray(res.data) ? res.data : [];

      setData(safeData);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: selalu array sebelum reduce
  const safeData = Array.isArray(data) ? data : [];

  const total = safeData.reduce((acc, item) => {
    return acc + (item?.value || 0);
  }, 0);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6" data-testid="progress-page">
      <h1 className="text-xl font-semibold mb-4">Progress Tracker</h1>

      {safeData.length === 0 ? (
        <p className="text-gray-500">Belum ada data progress</p>
      ) : (
        <div className="space-y-3">
          {safeData.map((item, index) => (
            <div
              key={index}
              className="p-3 border rounded-lg flex justify-between"
            >
              <span>{item?.name || "Tanpa nama"}</span>
              <span>{item?.value || 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <strong>Total:</strong> {total}
      </div>
    </div>
  );
}
