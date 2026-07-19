/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Complaint, ComplaintStatus, SOURCES, DIVISIONS } from "../types";
import {
  Search,
  Filter,
  Eye,
  Edit,
  ClipboardList,
  AlertCircle,
  ChevronDown,
  Calendar,
  User,
  ArrowUpDown,
  Trash2
} from "lucide-react";

interface FeedbackTableProps {
  complaints: Complaint[];
  onEditComplaint: (complaint: Complaint) => void;
  onManageNotes: (complaint: Complaint) => void;
  selectedComplaintId?: string;
  onSelectComplaint?: (complaint: Complaint) => void;
  onDeleteComplaint?: (complaint: Complaint) => void;
}

type SortField = "id" | "date" | "customerName" | "deadline" | "status";
type SortOrder = "asc" | "desc";

export default function FeedbackTable({
  complaints,
  onEditComplaint,
  onManageNotes,
  selectedComplaintId,
  onSelectComplaint,
  onDeleteComplaint
}: FeedbackTableProps) {
  // Search and Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [divisionFilter, setDivisionFilter] = useState<string>("All");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Handle sorting trigger
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter & Sort Logic
  const filteredComplaints = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    return complaints
      .filter((item) => {
        // Search filter
        const matchSearch =
          item.id.toLowerCase().includes(search.toLowerCase()) ||
          item.customerName.toLowerCase().includes(search.toLowerCase()) ||
          item.detail.toLowerCase().includes(search.toLowerCase()) ||
          item.pic.toLowerCase().includes(search.toLowerCase());

        // Status filter
        const matchStatus = statusFilter === "All" || item.status === statusFilter;

        // Source filter
        const matchSource = sourceFilter === "All" || item.source === sourceFilter;

        // Division filter
        const matchDivision = divisionFilter === "All" || item.division === divisionFilter;

        // Overdue filter
        const isOverdue = item.status !== ComplaintStatus.RESOLVED && item.deadline && item.deadline < todayStr;
        const matchOverdue = !showOverdueOnly || isOverdue;

        return matchSearch && matchStatus && matchSource && matchDivision && matchOverdue;
      })
      .sort((a, b) => {
        let valueA = a[sortField] || "";
        let valueB = b[sortField] || "";

        if (sortField === "status") {
          valueA = a.status as string;
          valueB = b.status as string;
        }

        if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
        if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [complaints, search, statusFilter, sourceFilter, divisionFilter, showOverdueOnly, sortField, sortOrder]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Filtering Header Bar */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Keluhan (Nama, Detail, Nomor tiket, PIC)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Quick Stats Indicator */}
          <div className="text-xs text-gray-500 font-medium self-center">
            Menampilkan <strong className="text-gray-800">{filteredComplaints.length}</strong> dari{" "}
            <strong className="text-gray-800">{complaints.length}</strong> tiket feedback
          </div>
        </div>

        {/* Filter Selection Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Status Penyelesaian
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Status</option>
              <option value={ComplaintStatus.OPEN}>Baru (Open)</option>
              <option value={ComplaintStatus.IN_PROGRESS}>Proses (In Progress)</option>
              <option value={ComplaintStatus.RESOLVED}>Selesai (Resolved)</option>
              <option value={ComplaintStatus.PENDING}>Ditunda (Pending)</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Sumber Informasi
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Sumber</option>
              {SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          {/* Division Filter */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Divisi Terkait
            </label>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">Semua Divisi</option>
              {DIVISIONS.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Filter */}
          <div className="flex items-center justify-start mt-4 pl-2">
            <label className="inline-flex items-center cursor-pointer space-x-2">
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Hanya Overdue
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[10px] tracking-wider select-none">
              <th className="py-3 px-4 w-12 text-center text-gray-400">Row</th>
              <th
                onClick={() => handleSort("id")}
                className="py-3 px-4 cursor-pointer hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>No. Keluhan</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("date")}
                className="py-3 px-4 cursor-pointer hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Tanggal Masuk</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("customerName")}
                className="py-3 px-4 cursor-pointer hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Pelanggan</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3 px-4">Sumber</th>
              <th className="py-3 px-4">Tipe Keluhan</th>
              <th className="py-3 px-4 w-72">Detail Keluhan</th>
              <th
                onClick={() => handleSort("deadline")}
                className="py-3 px-4 cursor-pointer hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Deadline</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3 px-4">Divisi & PIC</th>
              <th
                onClick={() => handleSort("status")}
                className="py-3 px-4 cursor-pointer hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3 px-4 w-44 text-center">Catatan Progres</th>
              <th className="py-3 px-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-gray-400 bg-white">
                  <ClipboardList className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                  <p className="font-medium text-sm">Tidak ada keluhan ditemukan</p>
                  <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci atau filter Anda.</p>
                </td>
              </tr>
            ) : (
              filteredComplaints.map((item) => {
                const isOverdue =
                  item.status !== ComplaintStatus.RESOLVED && item.deadline && item.deadline < todayStr;
                const isSelected = selectedComplaintId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectComplaint?.(item)}
                    className={`hover:bg-slate-50 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/40 border-l-4 border-l-indigo-600 font-medium"
                        : isOverdue
                        ? "bg-rose-50/10"
                        : "bg-white"
                    }`}
                  >
                    {/* Sheet row index indicator */}
                    <td className="py-3 px-4 text-center font-mono text-gray-400 border-r border-gray-100 bg-gray-50/30">
                      {item.rowIndex || "-"}
                    </td>

                    {/* Complaint ID */}
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 tracking-tight">
                      {item.id}
                    </td>

                    {/* Entry Date */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {item.date}
                    </td>

                    {/* Customer Name */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.customerName}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-lg text-[10px]">
                        {item.source || "-"}
                      </span>
                    </td>

                    {/* Complaint Type */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {item.type || "-"}
                    </td>

                    {/* Complaint Detail */}
                    <td className="py-3 px-4 text-slate-500 max-w-xs break-words">
                      <p className="line-clamp-2" title={item.detail}>
                        {item.detail}
                      </p>
                    </td>

                    {/* Deadline */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.deadline ? (
                        <div className="flex items-center space-x-1">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              isOverdue
                                ? "bg-rose-100 text-rose-700 animate-pulse"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.deadline}
                          </span>
                          {isOverdue && (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" title="Melewati batas waktu!" />
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Division & PIC */}
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-bold text-slate-900">{item.division || "-"}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        {item.pic || "Belum ditunjuk"}
                      </div>
                    </td>

                    {/* Resolution Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.status === ComplaintStatus.RESOLVED
                            ? "bg-green-100 text-green-700"
                            : item.status === ComplaintStatus.IN_PROGRESS
                            ? "bg-amber-100 text-amber-700"
                            : item.status === ComplaintStatus.PENDING
                            ? "bg-slate-100 text-slate-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            item.status === ComplaintStatus.RESOLVED
                              ? "bg-green-500"
                              : item.status === ComplaintStatus.IN_PROGRESS
                              ? "bg-amber-500"
                              : item.status === ComplaintStatus.PENDING
                              ? "bg-slate-400"
                              : "bg-blue-500"
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>

                    {/* Progres Log Preview Count */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onManageNotes(item); }}
                        className="inline-flex items-center justify-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer text-[10px]"
                        title="Klik untuk membuka riwayat progres harian"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px]">{item.notes.length}</span>
                        <span>Catatan</span>
                      </button>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-center border-l border-slate-50">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditComplaint(item); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Ubah data keluhan"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {onDeleteComplaint && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteComplaint(item); }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Hapus tiket keluhan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
        <span>* Baris merah mengindikasikan keluhan Overdue (belum selesai melewati deadline).</span>
        <span>
          Menampilkan {filteredComplaints.length} dari {complaints.length} baris
        </span>
      </div>
    </div>
  );
}
