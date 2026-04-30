import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, Database, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PARAMETERS = [
  "Kadar Air", "Kadar Abu", "Kadar Protein", "Kadar Lemak",
  "Kadar Karbohidrat", "Serat Kasar", "Aktivitas Air (Aw)", "Kapasitas Rehidrasi"
];

export default function ResearchData() {
  const [dataList, setDataList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    parameter: PARAMETERS[0],
    unit: "%",
    data: { F1: ["", "", ""], F2: ["", "", ""], F3: ["", "", ""] }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/research-data`);
      setDataList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateFormValue = (group, index, value) => {
    setForm((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [group]: prev.data[group].map((v, i) => (i === index ? value : v))
      }
    }));
  };

  const addFormRow = () => {
    setForm((prev) => ({
      ...prev,
      data: {
        F1: [...prev.data.F1, ""],
        F2: [...prev.data.F2, ""],
        F3: [...prev.data.F3, ""]
      }
    }));
  };

  const saveData = async () => {
    const processedData = {};
    for (const [key, values] of Object.entries(form.data)) {
      const nums = values.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
      if (nums.length === 0) return;
      processedData[key] = nums;
    }

    try {
      await axios.post(`${API}/research-data`, {
        parameter: form.parameter,
        unit: form.unit,
        data: processedData
      });
      setShowForm(false);
      setForm({ parameter: PARAMETERS[0], unit: "%", data: { F1: ["", "", ""], F2: ["", "", ""], F3: ["", "", ""] } });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteData = async (id) => {
    try {
      await axios.delete(`${API}/research-data/${id}`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="research-data-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Data Penelitian
          </h1>
          <p className="text-sm text-[#5C605A] mt-1">Kelola data fisikokimia bubur instan pegagan</p>
        </div>
        <button
          data-testid="add-data-button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-all hover:-translate-y-[1px]"
        >
          <Plus className="w-4 h-4" /> Tambah Data
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-[#E2E5DE] p-6 mb-6" data-testid="data-form">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Parameter</label>
              <select
                data-testid="data-parameter-select"
                value={form.parameter}
                onChange={(e) => setForm({ ...form, parameter: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
              >
                {PARAMETERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Satuan</label>
              <input
                data-testid="data-unit-input"
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
              />
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-[#E2E5DE]">
                <th className="text-left py-2 text-xs text-[#8A9087]">Ulangan</th>
                <th className="text-center py-2 text-xs text-[#4A6B46]">F1 (5%)</th>
                <th className="text-center py-2 text-xs text-[#4A6B46]">F2 (10%)</th>
                <th className="text-center py-2 text-xs text-[#4A6B46]">F3 (15%)</th>
              </tr>
            </thead>
            <tbody>
              {form.data.F1.map((_, i) => (
                <tr key={i} className="border-b border-[#E2E5DE]/50">
                  <td className="py-1 text-xs text-[#8A9087]">{i + 1}</td>
                  {["F1", "F2", "F3"].map((g) => (
                    <td key={g} className="py-1 px-1">
                      <input
                        data-testid={`data-input-${g}-${i}`}
                        type="number"
                        step="any"
                        value={form.data[g][i]}
                        onChange={(e) => updateFormValue(g, i, e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#E2E5DE] text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#4A6B46]/30"
                        placeholder="0.00"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center gap-3">
            <button onClick={addFormRow} className="text-xs text-[#4A6B46] hover:text-[#3C5739] font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah Ulangan
            </button>
            <div className="flex-1"></div>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-[#5C605A] hover:bg-[#F0F2ED] rounded-md transition-colors">
              Batal
            </button>
            <button
              data-testid="save-data-button"
              onClick={saveData}
              className="px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-colors"
            >
              Simpan Data
            </button>
          </div>
        </div>
      )}

      {/* Data List with Charts */}
      {dataList.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-[#E2E5DE] mx-auto mb-3" />
          <p className="text-sm text-[#8A9087]">Belum ada data penelitian. Tambahkan data pertama.</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="data-list">
          {dataList.map((item) => {
            const chartData = Object.entries(item.data).map(([name, values]) => ({
              name,
              mean: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
            }));

            return (
              <div key={item.id} className="bg-white rounded-lg border border-[#E2E5DE] p-6" data-testid={`data-item-${item.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-medium text-[#1C1C19]">{item.parameter}</h3>
                    <p className="text-xs text-[#8A9087]">Satuan: {item.unit}</p>
                  </div>
                  <button
                    data-testid={`delete-data-${item.id}`}
                    onClick={() => deleteData(item.id)}
                    className="p-2 rounded text-[#8A9087] hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Table */}
                  <table className="text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E5DE]">
                        <th className="text-left py-1 text-xs text-[#8A9087]">Perlakuan</th>
                        <th className="text-center py-1 text-xs text-[#8A9087]">Nilai</th>
                        <th className="text-center py-1 text-xs text-[#8A9087]">Rata-rata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(item.data).map(([name, values]) => (
                        <tr key={name} className="border-b border-[#E2E5DE]/50">
                          <td className="py-1.5 text-[#1C1C19] font-medium">{name}</td>
                          <td className="py-1.5 text-center text-xs text-[#5C605A]">{values.join(", ")}</td>
                          <td className="py-1.5 text-center font-medium text-[#4A6B46]">
                            {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mini Chart */}
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E5DE" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5C605A" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#5C605A" }} />
                      <Tooltip contentStyle={{ borderRadius: 6, fontSize: 11 }} />
                      <Bar dataKey="mean" fill="#4A6B46" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
