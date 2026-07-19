/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Complaint,
  ComplaintStatus,
  SOURCES,
  COMPLAINT_TYPES,
  DIVISIONS,
  PIC_LIST,
  Attachment
} from "../types";
import { 
  X, 
  Calendar, 
  User, 
  FileText, 
  Info, 
  Save, 
  Paperclip, 
  Image as ImageIcon, 
  File as FileIcon, 
  Trash2, 
  AlertCircle,
  UploadCloud 
} from "lucide-react";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (complaint: Omit<Complaint, "rowIndex"> & { rowIndex?: number }) => Promise<void>;
  complaint?: Complaint | null; // If present, we are in EDIT mode
  existingComplaints: Complaint[];
}

export default function ComplaintModal({
  isOpen,
  onClose,
  onSave,
  complaint,
  existingComplaints
}: ComplaintModalProps) {
  // Local Form States
  const [id, setId] = useState("");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [source, setSource] = useState("");
  const [type, setType] = useState("");
  const [detail, setDetail] = useState("");
  const [deadline, setDeadline] = useState("");
  const [division, setDivision] = useState("");
  const [pic, setPic] = useState("");
  const [status, setStatus] = useState<ComplaintStatus>(ComplaintStatus.OPEN);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const isEditMode = !!complaint;

  // State to manage list options (loaded from localStorage with dynamic fallback)
  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const [picList, setPicList] = useState<string[]>([]);
  const [typesList, setTypesList] = useState<string[]>([]);
  const [divisionsList, setDivisionsList] = useState<string[]>([]);

  // State to toggle custom typing
  const [isCustomSource, setIsCustomSource] = useState(false);
  const [customSourceVal, setCustomSourceVal] = useState("");
  const [isCustomPic, setIsCustomPic] = useState(false);
  const [customPicVal, setCustomPicVal] = useState("");
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeVal, setCustomTypeVal] = useState("");
  const [isCustomDivision, setIsCustomDivision] = useState(false);
  const [customDivisionVal, setCustomDivisionVal] = useState("");

  // Sync dynamic dropdown lists from localStorage or defaults
  useEffect(() => {
    if (isOpen) {
      // 1. Sources
      let currentSources = [...SOURCES];
      const savedSources = localStorage.getItem("sheet_complaint_sources");
      if (savedSources) {
        try { currentSources = JSON.parse(savedSources); } catch (e) { console.error(e); }
      }
      if (complaint && complaint.source && !currentSources.includes(complaint.source)) {
        currentSources.push(complaint.source);
      }
      setSourcesList(currentSources);

      // 2. PICs
      let currentPics = [...PIC_LIST];
      const savedPics = localStorage.getItem("sheet_complaint_pics");
      if (savedPics) {
        try { currentPics = JSON.parse(savedPics); } catch (e) { console.error(e); }
      }
      if (complaint && complaint.pic && !currentPics.includes(complaint.pic)) {
        currentPics.push(complaint.pic);
      }
      setPicList(currentPics);

      // 3. Types
      let currentTypes = [...COMPLAINT_TYPES];
      const savedTypes = localStorage.getItem("sheet_complaint_types");
      if (savedTypes) {
        try { currentTypes = JSON.parse(savedTypes); } catch (e) { console.error(e); }
      }
      if (complaint && complaint.type && !currentTypes.includes(complaint.type)) {
        currentTypes.push(complaint.type);
      }
      setTypesList(currentTypes);

      // 4. Divisions
      let currentDivisions = [...DIVISIONS];
      const savedDivisions = localStorage.getItem("sheet_complaint_divisions");
      if (savedDivisions) {
        try { currentDivisions = JSON.parse(savedDivisions); } catch (e) { console.error(e); }
      }
      if (complaint && complaint.division && !currentDivisions.includes(complaint.division)) {
        currentDivisions.push(complaint.division);
      }
      setDivisionsList(currentDivisions);
    }
  }, [isOpen, complaint]);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    const fileArray = Array.from(fileList);
    
    fileArray.forEach(file => {
      // 1.5MB max size limit to avoid overflowing Google Sheets cell size limit (50,000 chars)
      if (file.size > 1.5 * 1024 * 1024) {
        alert(`Ukuran file "${file.name}" melebihi batas 1.5 MB. Harap perkecil atau kompres gambar Anda.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        const newAttachment: Attachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: dataUrl
        };
        
        setAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.onerror = () => {
        console.error("Gagal membaca file:", file.name);
      };
      
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Initialize form values on open/change
  useEffect(() => {
    if (isOpen) {
      setError("");
      setIsCustomSource(false);
      setCustomSourceVal("");
      setIsCustomPic(false);
      setCustomPicVal("");
      setIsCustomType(false);
      setCustomTypeVal("");
      setIsCustomDivision(false);
      setCustomDivisionVal("");

      if (complaint) {
        // Edit mode
        setId(complaint.id);
        setDate(complaint.date);
        setCustomerName(complaint.customerName);
        setSource(complaint.source);
        setType(complaint.type);
        setDetail(complaint.detail);
        setDeadline(complaint.deadline);
        setDivision(complaint.division);
        setPic(complaint.pic);
        setStatus(complaint.status);
        setAttachments(complaint.attachments || []);
      } else {
        // Add mode: Prefill defaults
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        setDate(todayStr);
        setCustomerName("");
        setAttachments([]);
        
        // Use loaded lists or defaults
        const defaultSource = sourcesList.length > 0 ? sourcesList[0] : SOURCES[0];
        setSource(defaultSource);
        
        const defaultType = typesList.length > 0 ? typesList[0] : COMPLAINT_TYPES[0];
        setType(defaultType);
        
        setDetail("");
        
        // Default deadline to 3 days from now
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);
        const tY = threeDaysLater.getFullYear();
        const tM = String(threeDaysLater.getMonth() + 1).padStart(2, "0");
        const tD = String(threeDaysLater.getDate()).padStart(2, "0");
        setDeadline(`${tY}-${tM}-${tD}`);
        
        const defaultDivision = divisionsList.length > 0 ? divisionsList[0] : DIVISIONS[0];
        setDivision(defaultDivision);
        
        const defaultPic = picList.length > 0 ? picList[0] : PIC_LIST[0];
        setPic(defaultPic);
        
        setStatus(ComplaintStatus.OPEN);

        // Auto-generate ID: TKT-YYYYMMDD-XXX
        const idDateStr = `${yyyy}${mm}${dd}`;
        const prefix = `TKT-${idDateStr}-`;
        
        // Count tickets created today
        const todaysTickets = existingComplaints.filter(c => c.id.startsWith(prefix));
        const nextNum = todaysTickets.length + 1;
        const paddedNum = String(nextNum).padStart(3, "0");
        
        setId(`${prefix}${paddedNum}`);
      }
    }
  }, [isOpen, complaint, existingComplaints, sourcesList, picList, typesList, divisionsList]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple validation
    if (!customerName.trim()) {
      setError("Nama pelanggan wajib diisi.");
      return;
    }
    if (!detail.trim()) {
      setError("Detail keluhan wajib diisi.");
      return;
    }
    if (!deadline) {
      setError("Deadline wajib ditentukan.");
      return;
    }

    let finalSource = source;
    if (isCustomSource) {
      const trimmedCustom = customSourceVal.trim();
      if (!trimmedCustom) {
        setError("Sumber informasi kustom tidak boleh kosong.");
        return;
      }
      finalSource = trimmedCustom;
      
      // Persist new source in local storage
      const nextSources = [...sourcesList];
      if (!nextSources.includes(trimmedCustom)) {
        nextSources.push(trimmedCustom);
        localStorage.setItem("sheet_complaint_sources", JSON.stringify(nextSources));
        setSourcesList(nextSources);
      }
    }

    let finalType = type;
    if (isCustomType) {
      const trimmedCustom = customTypeVal.trim();
      if (!trimmedCustom) {
        setError("Tipe keluhan kustom tidak boleh kosong.");
        return;
      }
      finalType = trimmedCustom;
      
      // Persist new type in local storage
      const nextTypes = [...typesList];
      if (!nextTypes.includes(trimmedCustom)) {
        nextTypes.push(trimmedCustom);
        localStorage.setItem("sheet_complaint_types", JSON.stringify(nextTypes));
        setTypesList(nextTypes);
      }
    }

    let finalDivision = division;
    if (isCustomDivision) {
      const trimmedCustom = customDivisionVal.trim();
      if (!trimmedCustom) {
        setError("Divisi kustom tidak boleh kosong.");
        return;
      }
      finalDivision = trimmedCustom;

      // Persist new division in local storage
      const nextDivisions = [...divisionsList];
      if (!nextDivisions.includes(trimmedCustom)) {
        nextDivisions.push(trimmedCustom);
        localStorage.setItem("sheet_complaint_divisions", JSON.stringify(nextDivisions));
        setDivisionsList(nextDivisions);
      }
    }

    let finalPic = pic;
    if (isCustomPic) {
      const trimmedCustom = customPicVal.trim();
      if (!trimmedCustom) {
        setError("PIC kustom tidak boleh kosong.");
        return;
      }
      finalPic = trimmedCustom;

      // Persist new pic in local storage
      const nextPics = [...picList];
      if (!nextPics.includes(trimmedCustom)) {
        nextPics.push(trimmedCustom);
        localStorage.setItem("sheet_complaint_pics", JSON.stringify(nextPics));
        setPicList(nextPics);
      }
    }

    setLoading(true);
    try {
      // Build feedback object
      const dataToSave = {
        id,
        date,
        customerName: customerName.trim(),
        source: finalSource,
        type: finalType,
        detail: detail.trim(),
        deadline,
        division: finalDivision,
        pic: finalPic,
        status,
        notes: complaint ? complaint.notes : [], // Keep existing logs if editing
        attachments: attachments, // Include attachments here
        rowIndex: complaint?.rowIndex // Preserve rowIndex for updating
      };

      await onSave(dataToSave);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menyimpan data keluhan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
      {/* Modal Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {isEditMode ? `Ubah Data Keluhan ${id}` : "Tambah Keluhan Baru"}
            </h3>
            <p className="text-xs text-gray-500">
              {isEditMode ? "Ubah informasi keluhan pelanggan dan perbarui status." : "Buat keluhan baru dan jadwalkan penyelesaian."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Nomor Tiket & Tanggal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Nomor Keluhan (ID)
              </label>
              <input
                type="text"
                value={id}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono font-bold select-none focus:outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Nomor tiket dibuat otomatis sesuai tanggal.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Tanggal Masuk
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Nama Pelanggan & Sumber Informasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Nama Pelanggan
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Masukkan nama pelanggan..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase">
                  Sumber Informasi
                </label>
                {isCustomSource ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSource(false);
                      setSource(sourcesList[0] || SOURCES[0]);
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih dari daftar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSource(true);
                      setCustomSourceVal("");
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    + Tulis Manual
                  </button>
                )}
              </div>
              
              {isCustomSource ? (
                <input
                  type="text"
                  placeholder="Ketik sumber informasi (misal: TikTok)..."
                  value={customSourceVal}
                  onChange={(e) => setCustomSourceVal(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              ) : (
                <select
                  value={source}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomSource(true);
                      setCustomSourceVal("");
                    } else {
                      setSource(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sourcesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__custom__" className="text-indigo-600 font-bold">+ Tulis / Tambah Baru...</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 3: Tipe Keluhan & Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase">
                  Tipe Keluhan
                </label>
                {isCustomType ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomType(false);
                      setType(typesList[0] || COMPLAINT_TYPES[0]);
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih dari daftar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomType(true);
                      setCustomTypeVal("");
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    + Tulis Manual
                  </button>
                )}
              </div>

              {isCustomType ? (
                <input
                  type="text"
                  placeholder="Ketik tipe keluhan baru..."
                  value={customTypeVal}
                  onChange={(e) => setCustomTypeVal(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              ) : (
                <select
                  value={type}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomType(true);
                      setCustomTypeVal("");
                    } else {
                      setType(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {typesList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__custom__" className="text-indigo-600 font-bold">+ Tulis / Tambah Baru...</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                Deadline Penyelesaian
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Area 4: Detail Keluhan */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
              Detail Keluhan
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
              <textarea
                placeholder="Tuliskan secara lengkap detail keluhan dari pelanggan..."
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 5: Divisi Terkait & PIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase">
                  Divisi Terkait
                </label>
                {isCustomDivision ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDivision(false);
                      setDivision(divisionsList[0] || DIVISIONS[0]);
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih dari daftar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDivision(true);
                      setCustomDivisionVal("");
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    + Tulis Manual
                  </button>
                )}
              </div>

              {isCustomDivision ? (
                <input
                  type="text"
                  placeholder="Ketik nama divisi baru..."
                  value={customDivisionVal}
                  onChange={(e) => setCustomDivisionVal(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              ) : (
                <select
                  value={division}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomDivision(true);
                      setCustomDivisionVal("");
                    } else {
                      setDivision(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {divisionsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="__custom__" className="text-indigo-600 font-bold">+ Tulis / Tambah Baru...</option>
                </select>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-600 uppercase">
                  PIC (Person In Charge)
                </label>
                {isCustomPic ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPic(false);
                      setPic(picList[0] || PIC_LIST[0]);
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih dari daftar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPic(true);
                      setCustomPicVal("");
                    }}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    + Tulis Manual
                  </button>
                )}
              </div>
              
              {isCustomPic ? (
                <input
                  type="text"
                  placeholder="Ketik nama & jabatan PIC baru..."
                  value={customPicVal}
                  onChange={(e) => setCustomPicVal(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
              ) : (
                <select
                  value={pic}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setIsCustomPic(true);
                      setCustomPicVal("");
                    } else {
                      setPic(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {picList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__custom__" className="text-indigo-600 font-bold">+ Tulis / Tambah Baru...</option>
                </select>
              )}
            </div>
          </div>

          {/* Area 5.5: Lampiran / Attachments */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
              Lampiran (File / Gambar)
            </label>
            
            {/* Drag & Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-indigo-50/50" 
                  : "border-gray-200 hover:border-gray-300 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input 
                type="file" 
                id="file-upload-input" 
                multiple 
                onChange={handleFileChange}
                className="hidden" 
              />
              
              <label htmlFor="file-upload-input" className="cursor-pointer block">
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-lg bg-white shadow-xs border border-gray-150 flex items-center justify-center text-gray-400">
                    <UploadCloud className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-indigo-600 hover:underline">Klik untuk unggah</span> atau seret file ke sini
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">PNG, JPG, PDF, atau DOCX (Maksimal 1.5MB per file)</p>
                </div>
              </label>
            </div>

            {/* List of uploaded attachments */}
            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((attach, idx) => {
                  const isImage = attach.type.startsWith("image/");
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
                      <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                        {isImage && attach.dataUrl ? (
                          <img 
                            src={attach.dataUrl} 
                            alt={attach.name} 
                            className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                            {attach.name.endsWith(".pdf") ? (
                              <span className="text-[9px] font-black text-rose-500 font-mono">PDF</span>
                            ) : (
                              <FileIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="truncate flex-1">
                          <p className="font-bold text-gray-700 truncate text-[11px]" title={attach.name}>
                            {attach.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {(attach.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Hapus Lampiran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Area 6: Status Penyelesaian */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
              Status Penyelesaian
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(ComplaintStatus).map((s) => {
                const isActive = status === s;
                let activeClass = "";
                
                switch (s) {
                  case ComplaintStatus.OPEN:
                    activeClass = isActive ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";
                    break;
                  case ComplaintStatus.IN_PROGRESS:
                    activeClass = isActive ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";
                    break;
                  case ComplaintStatus.RESOLVED:
                    activeClass = isActive ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";
                    break;
                  case ComplaintStatus.PENDING:
                    activeClass = isActive ? "bg-slate-600 border-slate-600 text-white shadow-md shadow-slate-500/10" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50";
                    break;
                }

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`border px-3 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${activeClass}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-150 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Menyimpan..." : "Simpan Keluhan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
