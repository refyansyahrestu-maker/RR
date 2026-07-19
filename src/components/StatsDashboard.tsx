/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Complaint, ComplaintStatus } from "../types";
import { CheckCircle2, Clock, AlertTriangle, Inbox, ClipboardList } from "lucide-react";

interface StatsDashboardProps {
  complaints: Complaint[];
}

export default function StatsDashboard({ complaints }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const total = complaints.length;
    let resolved = 0;
    let inProgress = 0;
    let pending = 0;
    let open = 0;
    let overdue = 0;

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    complaints.forEach((c) => {
      switch (c.status) {
        case ComplaintStatus.RESOLVED:
          resolved++;
          break;
        case ComplaintStatus.IN_PROGRESS:
          inProgress++;
          break;
        case ComplaintStatus.PENDING:
          pending++;
          break;
        case ComplaintStatus.OPEN:
          open++;
          break;
      }

      // Overdue check: if deadline is passed and status is not Resolved
      if (c.status !== ComplaintStatus.RESOLVED && c.deadline && c.deadline < todayStr) {
        overdue++;
      }
    });

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Breakdown by Type
    const typeMap: Record<string, number> = {};
    complaints.forEach((c) => {
      const t = c.type || "Lainnya";
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    const typeData = Object.keys(typeMap).map((key) => ({
      name: key,
      value: typeMap[key]
    }));

    // Breakdown by Division
    const divisionMap: Record<string, number> = {};
    complaints.forEach((c) => {
      const d = c.division || "Belum Ditentukan";
      divisionMap[d] = (divisionMap[d] || 0) + 1;
    });
    const divisionData = Object.keys(divisionMap).map((key) => ({
      name: key,
      value: divisionMap[key]
    }));

    // Breakdown by PIC
    const picMap: Record<string, number> = {};
    complaints.forEach((c) => {
      const p = c.pic || "Belum Ditunjuk";
      picMap[p] = (picMap[p] || 0) + 1;
    });
    const picData = Object.keys(picMap).map((key) => ({
      name: key,
      value: picMap[key]
    }));

    return {
      total,
      resolved,
      inProgress,
      pending,
      open,
      overdue,
      resolutionRate,
      typeData,
      divisionData,
      picData
    };
  }, [complaints]);

  // Color Palette
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"];
  const STATUS_COLORS = {
    [ComplaintStatus.OPEN]: "#3b82f6",       // Blue
    [ComplaintStatus.IN_PROGRESS]: "#f59e0b", // Amber
    [ComplaintStatus.RESOLVED]: "#10b981",    // Emerald
    [ComplaintStatus.PENDING]: "#94a3b8"      // Slate/Gray
  };

  const statusPieData = [
    { name: "Baru", value: stats.open, color: STATUS_COLORS[ComplaintStatus.OPEN] },
    { name: "Proses", value: stats.inProgress, color: STATUS_COLORS[ComplaintStatus.IN_PROGRESS] },
    { name: "Selesai", value: stats.resolved, color: STATUS_COLORS[ComplaintStatus.RESOLVED] },
    { name: "Ditunda", value: stats.pending, color: STATUS_COLORS[ComplaintStatus.PENDING] }
  ].filter(item => item.value > 0);

  return (
    <div id="stats-dashboard" className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Keluhan</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.total}</p>
          </div>
        </div>

        {/* Baru */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Baru (Open)</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.open}</p>
          </div>
        </div>

        {/* Proses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dalam Proses</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.inProgress}</p>
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai</p>
            <p className="text-2xl font-extrabold text-emerald-600">{stats.resolved}</p>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 col-span-2 md:col-span-1 transition-all hover:shadow-md">
          <div className={`p-3 rounded-xl ${stats.overdue > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-50 text-slate-400"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue</p>
            <p className={`text-2xl font-extrabold ${stats.overdue > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {stats.overdue}
            </p>
          </div>
        </div>
      </div>

      {/* Progress & Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resolution Rate Radial & Status Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm mb-0.5 uppercase tracking-wide">Rasio Penyelesaian</h3>
            <p className="text-xs text-slate-400">Persentase keluhan yang berhasil diselesaikan.</p>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Concentric Circle Progress Indicator */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-slate-100"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-emerald-500 transition-all duration-500 ease-out"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - stats.resolutionRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-800">{stats.resolutionRate}%</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">Selesai</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-2">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Total Selesai: <strong className="text-emerald-600 font-bold">{stats.resolved}</strong></span>
              <span>Belum Selesai: <strong className="text-amber-600 font-bold">{stats.total - stats.resolved}</strong></span>
            </div>
          </div>
        </div>

        {/* Status Breakdown & Type Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all hover:shadow-md">
          <h3 className="font-extrabold text-slate-800 text-sm mb-0.5 uppercase tracking-wide">Kategori Tipe Keluhan</h3>
          <p className="text-xs text-slate-400 mb-4">Jumlah keluhan berdasarkan klasifikasi tipe.</p>
          <div className="flex-1 min-h-[180px]">
            {stats.typeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada data tipe keluhan
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.typeData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {stats.typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Breakdown Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all hover:shadow-md">
          <h3 className="font-extrabold text-slate-800 text-sm mb-0.5 uppercase tracking-wide">Proporsi Status</h3>
          <p className="text-xs text-slate-400 mb-4">Perbandingan status penyelesaian keluhan saat ini.</p>
          <div className="flex-1 flex items-center justify-center min-h-[180px]">
            {statusPieData.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Belum ada data status</div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-center">
                <div className="w-1/2 h-full min-h-[140px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col space-y-2 justify-center pl-4">
                  {statusPieData.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-500 font-bold">{item.name}:</span>
                      <span className="text-slate-800 font-extrabold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Division Distribution Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Division Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <h3 className="font-extrabold text-slate-800 text-sm mb-0.5 uppercase tracking-wide">Distribusi Keluhan Per Divisi</h3>
          <p className="text-xs text-slate-400 mb-4">Menampilkan beban penanganan keluhan per departemen/divisi.</p>
          <div className="h-64">
            {stats.divisionData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada data divisi terkait
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.divisionData} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PIC Workload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <h3 className="font-extrabold text-slate-800 text-sm mb-0.5 uppercase tracking-wide">Beban Tugas PIC</h3>
          <p className="text-xs text-slate-400 mb-4">Jumlah tiket keluhan yang sedang ditangani oleh masing-masing staff.</p>
          <div className="h-64">
            {stats.picData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                Belum ada PIC ditunjuk
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.picData} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="name" tickFormatter={(v) => v.split(" ")[0]} tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
