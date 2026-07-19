/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Complaint, ProgressLog } from "../types";
import { X, Calendar, MessageSquare, Plus, Send, AlertCircle, History } from "lucide-react";

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onAddNote: (complaintId: string, text: string) => Promise<void>;
}

export default function NotesPanel({
  isOpen,
  onClose,
  complaint,
  onAddNote
}: NotesPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newNote.trim()) {
      setError("Catatan progres harian tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      await onAddNote(complaint.id, newNote.trim());
      setNewNote(""); // Clear input
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menyimpan catatan progres harian.");
    } finally {
      setLoading(false);
    }
  };

  // Sort notes so newest is at the top for faster reading
  const sortedNotes = [...complaint.notes].reverse();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-gray-950/40 backdrop-blur-xs">
      
      {/* Backdrop trigger */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-gray-100 animate-slide-in-right">
        
        {/* Panel Header */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Catatan Progres Harian</h3>
              <p className="text-[10px] text-blue-600 font-bold font-mono tracking-wider">{complaint.id} - {complaint.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Timeline Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50/30">
          
          {/* Active Complaint Quick Info Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Keluhan Awal</h4>
            <div className="text-xs text-gray-800 font-medium bg-gray-50 p-2.5 rounded-lg whitespace-pre-wrap border border-gray-100">
              {complaint.detail}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-semibold pt-1">
              <span>PIC: {complaint.pic || "-"}</span>
              <span>Deadline: {complaint.deadline || "-"}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Riwayat Progres</h4>
            
            {sortedNotes.length === 0 ? (
              <div className="text-center py-10 bg-white border border-dashed border-gray-200 rounded-xl">
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">Belum ada progres dicatat</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Mulai catat perkembangan penanganan keluhan ini di bawah.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-blue-100 pl-4 ml-2.5 space-y-5">
                {sortedNotes.map((note, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Icon/Dot */}
                    <span className="absolute -left-[25px] top-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full ring-4 ring-blue-50 group-hover:scale-110 transition-transform" />
                    
                    {/* Notes Card */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          {note.date || "Tgl Tidak Diketahui"}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Progres Log</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel Form Footer */}
        <div className="p-4 border-t border-gray-100 bg-white shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 font-medium flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="relative">
              <textarea
                placeholder="Tulis update progres penanganan keluhan harian di sini..."
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                disabled={loading}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium italic">
                * Waktu & tanggal akan dicatat otomatis.
              </span>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{loading ? "Menyimpan..." : "Tambah Progres"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
