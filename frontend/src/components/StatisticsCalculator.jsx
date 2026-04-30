import React, { useState } from "react";
import axios from "axios";
import { Calculator, Plus, Trash2, BarChart3, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StatisticsCalculator() {
  const [parameterName, setParameterName] = useState("");
  const [alpha, setAlpha] = useState(0.05);
  const [groups, setGroups] = useState({
    F1: ["", "", ""],
    F2: ["", "", ""],
    F3: ["", "", ""],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateValue = (group, index, value) => {
    setGroups((prev) => ({
      ...prev,
      [group]: prev[group].map((v, i) => (i === index ? value : v)),
    }));
  };

  const addRow = () => {
    setGroups((prev) => {
      const updated = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = [...prev[key], ""];
      });
      return updated;
    });
  };

  const removeRow = (index) => {
    if (Object.values(groups)[0].length <= 2) return;
    setGroups((prev) => {
      const updated = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = prev[key].filter((_, i) => i !== index);
      });
      return updated;
    });
  };

  const calculate = async () => {
    setError("");
    setResult(null);

    // Validate
    const data = {};
    for (const [key, values] of Object.entries(groups)) {
      const nums = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
      if (nums.length < 2) {
        setError(`Grup ${key} membutuhkan minimal 2 nilai valid.`);
        return;
      }
      data[key] = nums;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/statistics/calculate`, {
        data,
        parameter_name: parameterName || "Parameter",
        alpha,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Terjadi kesalahan kalkulasi.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? Object.entries(result.descriptive).map(([name, stats]) => ({
        name,
        mean: stats.mean,
        std: stats.std,
      }))
    : [];

  const exportCSV = async () => {
    const data = {};
    for (const [key, values] of Object.entries(groups)) {
      const nums = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
      if (nums.length >= 2) data[key] = nums;
    }
    try {
      const response = await axios.post(`${API}/statistics/export-csv`, {
        data,
        parameter_name: parameterName || "Parameter",
        alpha,
      }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `statistik_${(parameterName || "parameter").replace(/ /g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="statistics-page">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Kalkulator Statistik
        </h1>
        <p className="text-sm text-[#5C605A] mt-1">ANOVA satu arah dan uji lanjut DMRT</p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg border border-[#E2E5DE] p-6 mb-6" data-testid="stats-input-section">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-[#5C605A] uppercase tracking-wide">Nama Parameter</label>
            <input
              data-testid="parameter-name-input"
              type="text"
              value={parameterName}
              onChange={(e) => setParameterName(e.target.value)}
              placeholder="Contoh: Kadar Air"
              className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5C605A] uppercase tracking-wide">Tingkat Signifikansi (Alpha)</label>
            <input
              data-testid="alpha-input"
              type="number"
              step="0.01"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="data-table">
            <thead>
              <tr className="border-b border-[#E2E5DE]">
                <th className="text-left py-2 px-2 text-xs text-[#8A9087] font-medium">Ulangan</th>
                {Object.keys(groups).map((group) => (
                  <th key={group} className="text-center py-2 px-2 text-xs font-medium text-[#4A6B46]">
                    {group} ({group === "F1" ? "5%" : group === "F2" ? "10%" : "15%"})
                  </th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {Object.values(groups)[0].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-[#E2E5DE]/50">
                  <td className="py-2 px-2 text-xs text-[#8A9087]">{rowIndex + 1}</td>
                  {Object.keys(groups).map((group) => (
                    <td key={group} className="py-1 px-1">
                      <input
                        data-testid={`input-${group}-${rowIndex}`}
                        type="number"
                        step="any"
                        value={groups[group][rowIndex]}
                        onChange={(e) => updateValue(group, rowIndex, e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#E2E5DE] text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#4A6B46]/30 focus:border-[#4A6B46]"
                        placeholder="0.00"
                      />
                    </td>
                  ))}
                  <td className="px-1">
                    <button
                      onClick={() => removeRow(rowIndex)}
                      className="p-1 text-[#8A9087] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            data-testid="add-row-button"
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-[#4A6B46] hover:text-[#3C5739] font-medium"
          >
            <Plus className="w-3 h-3" /> Tambah Ulangan
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm" data-testid="stats-error">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button
            data-testid="calculate-button"
            onClick={calculate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] disabled:opacity-50 transition-all hover:-translate-y-[1px]"
          >
            <Calculator className="w-4 h-4" />
            {loading ? "Menghitung..." : "Hitung ANOVA & DMRT"}
          </button>
          {result && (
            <button
              data-testid="export-csv-button"
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#E2E5DE] text-sm text-[#5C605A] hover:bg-[#F0F2ED] transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4" data-testid="stats-results">
          {/* ANOVA */}
          <div className="bg-white rounded-lg border border-[#E2E5DE] p-6">
            <h3 className="text-lg font-medium text-[#1C1C19] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Hasil ANOVA - {result.parameter_name}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-md bg-[#F0F2ED]">
                <p className="text-xs text-[#8A9087]">F-Statistik</p>
                <p className="text-lg font-semibold text-[#1C1C19]" data-testid="f-statistic">{result.anova.f_statistic}</p>
              </div>
              <div className="p-3 rounded-md bg-[#F0F2ED]">
                <p className="text-xs text-[#8A9087]">P-Value</p>
                <p className="text-lg font-semibold text-[#1C1C19]" data-testid="p-value">{result.anova.p_value}</p>
              </div>
              <div className={`p-3 rounded-md ${result.anova.significant ? "bg-green-50" : "bg-yellow-50"}`}>
                <p className="text-xs text-[#8A9087]">Kesimpulan</p>
                <p className={`text-sm font-medium ${result.anova.significant ? "text-green-700" : "text-yellow-700"}`} data-testid="significance-result">
                  {result.anova.significant ? "Berbeda Signifikan" : "Tidak Berbeda Signifikan"}
                </p>
              </div>
            </div>
          </div>

          {/* DMRT */}
          {result.dmrt && (
            <div className="bg-white rounded-lg border border-[#E2E5DE] p-6" data-testid="dmrt-results">
              <h3 className="text-lg font-medium text-[#1C1C19] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Hasil Uji DMRT
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E5DE]">
                    <th className="text-left py-2 text-xs text-[#8A9087]">Perlakuan</th>
                    <th className="text-center py-2 text-xs text-[#8A9087]">Rata-rata</th>
                    <th className="text-center py-2 text-xs text-[#8A9087]">Notasi DMRT</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dmrt.ranked_means.map((item) => (
                    <tr key={item.group} className="border-b border-[#E2E5DE]/50">
                      <td className="py-2 font-medium text-[#1C1C19]">{item.group}</td>
                      <td className="py-2 text-center">{item.mean}</td>
                      <td className="py-2 text-center font-semibold text-[#4A6B46]">{item.dmrt_group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-[#8A9087]">
                MSE: {result.dmrt.mse} | SE: {result.dmrt.se} | df: {result.dmrt.df_within}
              </p>
            </div>
          )}

          {/* Chart */}
          <div className="bg-white rounded-lg border border-[#E2E5DE] p-6" data-testid="stats-chart">
            <h3 className="text-lg font-medium text-[#1C1C19] mb-4 flex items-center gap-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              <BarChart3 className="w-5 h-5 text-[#4A6B46]" /> Visualisasi Data
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E5DE" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5C605A" }} />
                <YAxis tick={{ fontSize: 12, fill: "#5C605A" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E5DE", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mean" fill="#4A6B46" name="Rata-rata" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Descriptive */}
          <div className="bg-white rounded-lg border border-[#E2E5DE] p-6" data-testid="descriptive-stats">
            <h3 className="text-lg font-medium text-[#1C1C19] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Statistik Deskriptif
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E5DE]">
                  <th className="text-left py-2 text-xs text-[#8A9087]">Perlakuan</th>
                  <th className="text-center py-2 text-xs text-[#8A9087]">n</th>
                  <th className="text-center py-2 text-xs text-[#8A9087]">Rata-rata</th>
                  <th className="text-center py-2 text-xs text-[#8A9087]">Std. Deviasi</th>
                  <th className="text-center py-2 text-xs text-[#8A9087]">Min</th>
                  <th className="text-center py-2 text-xs text-[#8A9087]">Max</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.descriptive).map(([name, stats]) => (
                  <tr key={name} className="border-b border-[#E2E5DE]/50">
                    <td className="py-2 font-medium text-[#1C1C19]">{name}</td>
                    <td className="py-2 text-center">{stats.n}</td>
                    <td className="py-2 text-center">{stats.mean}</td>
                    <td className="py-2 text-center">{stats.std}</td>
                    <td className="py-2 text-center">{stats.min}</td>
                    <td className="py-2 text-center">{stats.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
