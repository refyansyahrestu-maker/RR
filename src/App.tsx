/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from "./lib/firebase";
import {
  listSpreadsheets,
  createFeedbackSpreadsheet,
  getSpreadsheetDetails,
  initializeHeaders,
  fetchFeedbackRecords,
  appendFeedbackRecord,
  updateFeedbackRecord,
  deleteFeedbackRecord
} from "./lib/googleSheets";
import { Complaint, ComplaintStatus, ProgressLog } from "./types";
import FeedbackTable from "./components/FeedbackTable";
import ComplaintModal from "./components/ComplaintModal";
import NotesPanel from "./components/NotesPanel";
import StatsDashboard from "./components/StatsDashboard";
import SettingsView from "./components/SettingsView";
import {
  Database,
  Plus,
  RefreshCw,
  LogOut,
  FolderOpen,
  FileSpreadsheet,
  Layers,
  BarChart3,
  ExternalLink,
  Loader2,
  FileUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle,
  Clock,
  Settings,
  File as FileIcon,
  ArrowDown,
  Trash2
} from "lucide-react";

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Spreadsheet Selection State
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>("");
  const [selectedSpreadsheetTitle, setSelectedSpreadsheetTitle] = useState<string>("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>("");
  const [driveLoading, setDriveLoading] = useState(false);
  const [customSheetId, setCustomSheetId] = useState("");
  const [newSheetTitle, setNewSheetTitle] = useState("Database Feedback Pelanggan");

  // Feedback Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // UI Navigation / Modals State
  const [activeTab, setActiveTab] = useState<"table" | "dashboard" | "guide">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [activeNotesComplaint, setActiveNotesComplaint] = useState<Complaint | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const stats = useMemo(() => {
    const total = complaints.length;
    let resolved = 0;
    let inProgress = 0;
    let pending = 0;
    let open = 0;
    let overdue = 0;

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

      if (c.status !== ComplaintStatus.RESOLVED && c.deadline && c.deadline < todayStr) {
        overdue++;
      }
    });

    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      resolved,
      inProgress,
      pending,
      open,
      overdue,
      resolutionRate
    };
  }, [complaints, todayStr]);

  const selectedComplaint = useMemo(() => {
    if (complaints.length === 0) return null;
    return complaints.find(c => c.id === selectedComplaintId) || complaints[0];
  }, [complaints, selectedComplaintId]);

  // Set first complaint as selected on load or when selection is invalid
  useEffect(() => {
    if (complaints.length > 0) {
      if (!selectedComplaintId || !complaints.some(c => c.id === selectedComplaintId)) {
        setSelectedComplaintId(complaints[0].id);
      }
    } else {
      setSelectedComplaintId(null);
    }
  }, [complaints, selectedComplaintId]);


  // Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthLoading(false);
        setNeedsAuth(false);
        // Automatically fetch files after login
        loadDriveFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthLoading(false);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Show automatic alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Load Spreadsheets from Google Drive
  const loadDriveFiles = async (accessToken: string) => {
    setDriveLoading(true);
    setErrorMessage("");
    try {
      const files = await listSpreadsheets(accessToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Gagal memuat daftar file dari Google Drive. Silakan coba login kembali.");
    } finally {
      setDriveLoading(false);
    }
  };

  // Sign In Trigger
  const handleLogin = async () => {
    setAuthLoading(true);
    setErrorMessage("");
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        await loadDriveFiles(result.accessToken);
        setSuccessMessage("Berhasil masuk dengan akun Google!");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Autentikasi gagal. Silakan coba lagi.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign Out Trigger
  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSelectedSpreadsheetId("");
      setSelectedSpreadsheetTitle("");
      setComplaints([]);
      setSuccessMessage("Berhasil keluar dari akun Google.");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Gagal keluar akun.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Create a brand new Spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    if (!token) return;
    if (!newSheetTitle.trim()) {
      setErrorMessage("Nama spreadsheet tidak boleh kosong.");
      return;
    }

    setDriveLoading(true);
    setErrorMessage("");
    try {
      // 1. Create Spreadsheet file
      const newId = await createFeedbackSpreadsheet(token, newSheetTitle.trim());
      
      // 2. Initialize correct column headers
      await initializeHeaders(token, newId, "Feedback Pelanggan");
      
      setSuccessMessage(`Berhasil membuat spreadsheet '${newSheetTitle}'!`);
      // 3. Connect to it automatically
      await handleSelectSpreadsheet(newId, newSheetTitle, "Feedback Pelanggan");
      
      // Refresh Drive file list in background
      loadDriveFiles(token);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal membuat spreadsheet baru: ${err.message}`);
    } finally {
      setDriveLoading(false);
    }
  };

  // Select/Connect to an existing Spreadsheet
  const handleSelectSpreadsheet = async (id: string, title?: string, forceSheetName?: string) => {
    if (!token) return;
    setDataLoading(true);
    setErrorMessage("");
    try {
      // Fetch details of sheets within spreadsheet
      const details = await getSpreadsheetDetails(token, id);
      setSelectedSpreadsheetId(details.id);
      setSelectedSpreadsheetTitle(title || details.title);
      setSheetNames(details.sheets);
      
      // Set active sheet tab. If "Feedback Pelanggan" exists, select it. Otherwise, use the first tab.
      const preferredSheet = forceSheetName || (details.sheets.includes("Feedback Pelanggan") 
        ? "Feedback Pelanggan" 
        : details.sheets[0]);
      
      setActiveSheetName(preferredSheet);
      
      // Load complaints records
      await loadFeedbackRecords(details.id, preferredSheet);
      
      setSuccessMessage(`Berhasil menghubungkan ke spreadsheet: ${title || details.title}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal memuat detail spreadsheet: ${err.message}. Pastikan file dapat diakses.`);
    } finally {
      setDataLoading(false);
    }
  };

  // Submit custom sheet ID
  const handleConnectCustomId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetId.trim()) return;
    await handleSelectSpreadsheet(customSheetId.trim(), "Spreadsheet Kustom (Berdasarkan ID)");
  };

  // Load feedback records from active Sheet
  const loadFeedbackRecords = async (spreadsheetId: string, sheetName: string) => {
    if (!token) return;
    setDataLoading(true);
    setErrorMessage("");
    try {
      const records = await fetchFeedbackRecords(token, spreadsheetId, sheetName);
      setComplaints(records);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal membaca data baris feedback: ${err.message}. Hubungi pengelola atau periksa struktur sheet.`);
    } finally {
      setDataLoading(false);
    }
  };

  // Switch Sheet Tab within active Spreadsheet
  const handleSheetTabChange = async (newSheetName: string) => {
    if (!selectedSpreadsheetId) return;
    setActiveSheetName(newSheetName);
    await loadFeedbackRecords(selectedSpreadsheetId, newSheetName);
  };

  // Save/Update Complaint (Add or Edit)
  const handleSaveComplaint = (formData: Omit<Complaint, "rowIndex"> & { rowIndex?: number }): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!token || !selectedSpreadsheetId || !activeSheetName) {
        reject(new Error("Layanan tidak terhubung atau token habis."));
        return;
      }

      const isEdit = !!formData.rowIndex;

      const executeSave = async () => {
        try {
          if (isEdit) {
            // Update row
            await updateFeedbackRecord(token, selectedSpreadsheetId, activeSheetName, formData as Complaint);
            setSuccessMessage(`Baris data keluhan ${formData.id} berhasil diperbarui di Google Sheets!`);
          } else {
            // Append new row
            await appendFeedbackRecord(token, selectedSpreadsheetId, activeSheetName, formData);
            setSuccessMessage(`Keluhan baru ${formData.id} berhasil ditambahkan ke Google Sheets!`);
          }

          // Reload records to refresh state
          await loadFeedbackRecords(selectedSpreadsheetId, activeSheetName);
          resolve();
        } catch (err: any) {
          console.error(err);
          reject(new Error(`Gagal menyimpan ke Google Sheets: ${err.message}`));
        }
      };

      if (isEdit) {
        setConfirmState({
          isOpen: true,
          title: "Perbarui Data Keluhan?",
          message: `Apakah Anda yakin ingin memperbarui data tiket ${formData.id} untuk pelanggan ${formData.customerName} di Google Sheets?`,
          onConfirm: executeSave,
          onCancel: () => {
            reject(new Error("Pembaruan data keluhan dibatalkan."));
          }
        });
      } else {
        executeSave();
      }
    });
  };

  // Add a Daily Progress Note
  const handleAddProgressNote = (complaintId: string, text: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!token || !selectedSpreadsheetId || !activeSheetName) {
        reject(new Error("Layanan tidak terhubung atau token habis."));
        return;
      }

      // Find the current complaint
      const currentComp = complaints.find(c => c.id === complaintId);
      if (!currentComp) {
        reject(new Error("Tiket keluhan tidak ditemukan."));
        return;
      }

      // Build the new progress log
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const hh = String(today.getHours()).padStart(2, "0");
      const min = String(today.getMinutes()).padStart(2, "0");
      
      const timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      const newLog: ProgressLog = {
        date: timestamp,
        text: text
      };

      const updatedNotes = [...currentComp.notes, newLog];
      const updatedComplaint: Complaint = {
        ...currentComp,
        notes: updatedNotes
      };

      setConfirmState({
        isOpen: true,
        title: "Tambah Catatan Progres?",
        message: `Apakah Anda yakin ingin menambahkan catatan progres harian baru untuk tiket ${complaintId} ke Google Sheets?`,
        onConfirm: async () => {
          try {
            await updateFeedbackRecord(token, selectedSpreadsheetId, activeSheetName, updatedComplaint);
            setSuccessMessage(`Catatan progres harian untuk ${complaintId} berhasil disimpan ke Google Sheets!`);
            
            // Update local state temporarily for notes modal visual feedback
            setComplaints(prev => prev.map(c => c.id === complaintId ? updatedComplaint : c));
            setActiveNotesComplaint(updatedComplaint);

            // Re-fetch in background to ensure perfect parity
            loadFeedbackRecords(selectedSpreadsheetId, activeSheetName);
            resolve();
          } catch (err: any) {
            console.error(err);
            reject(new Error(`Gagal menyimpan catatan progres: ${err.message}`));
          }
        },
        onCancel: () => {
          reject(new Error("Penambahan catatan progres dibatalkan."));
        }
      });
    });
  };

  // Delete a Complaint Ticket
  const handleDeleteComplaint = (complaint: Complaint) => {
    if (!token || !selectedSpreadsheetId || !activeSheetName) return;

    if (!complaint.rowIndex) {
      alert("Tiket keluhan tidak memiliki index baris yang valid di Google Sheets.");
      return;
    }

    setConfirmState({
      isOpen: true,
      title: "Hapus Tiket Keluhan?",
      message: `Apakah Anda yakin ingin menghapus tiket keluhan ${complaint.id} untuk pelanggan ${complaint.customerName} secara permanen dari Google Sheets? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          await deleteFeedbackRecord(token, selectedSpreadsheetId, activeSheetName, complaint.rowIndex!);
          setSuccessMessage(`Tiket keluhan ${complaint.id} berhasil dihapus dari Google Sheets!`);
          
          // Clear active selection if the deleted complaint was selected
          if (selectedComplaintId === complaint.id) {
            setSelectedComplaintId(null);
          }
          
          // Reload records to refresh state
          loadFeedbackRecords(selectedSpreadsheetId, activeSheetName);
        } catch (err: any) {
          console.error(err);
          alert(`Gagal menghapus tiket keluhan: ${err.message}`);
        }
      }
    });
  };

  // Open Edit Modal
  const openEditModal = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setIsModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingComplaint(null);
    setIsModalOpen(true);
  };

  // Open Notes Panel
  const openNotesPanel = (complaint: Complaint) => {
    setActiveNotesComplaint(complaint);
    setIsNotesOpen(true);
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div id="loading-screen" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h3 className="text-sm font-semibold text-gray-800">Menghubungkan Layanan...</h3>
        <p className="text-xs text-gray-400 mt-1">Harap tunggu sebentar sementara sistem menyiapkan autentikasi Google.</p>
      </div>
    );
  }

  // Welcome / Auth Required Screen
  if (needsAuth) {
    return (
      <div id="auth-screen" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl p-8 space-y-6 text-center">
          {/* Logo Brand / Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Database className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Customer Feedback Sheet
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Sistem manajemen keluhan dan feedback pelanggan yang tersinkronisasi langsung dengan **Google Sheets** dan **Google Drive** milik Anda secara real-time.
            </p>
          </div>

          {/* Quick Features List */}
          <div className="bg-slate-50/70 p-4 rounded-xl text-left space-y-3.5 border border-slate-100">
            <div className="flex items-start space-x-3 text-xs">
              <span className="p-1 bg-blue-100 text-blue-700 rounded-md font-bold">1</span>
              <div>
                <p className="font-bold text-gray-800">Formulir & Spreadsheet Interaktif</p>
                <p className="text-gray-500 text-[11px]">Tambahkan feedback, pic, batas waktu, tipe keluhan, dan divisi terkait.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-xs">
              <span className="p-1 bg-blue-100 text-blue-700 rounded-md font-bold">2</span>
              <div>
                <p className="font-bold text-gray-800">Sinkronisasi Google Sheets Otomatis</p>
                <p className="text-gray-500 text-[11px]">Semua data tersimpan aman dan kolaboratif langsung di file spreadsheet Anda.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-xs">
              <span className="p-1 bg-blue-100 text-blue-700 rounded-md font-bold">3</span>
              <div>
                <p className="font-bold text-gray-800">Catatan Progres Harian & Analitik</p>
                <p className="text-gray-500 text-[11px]">Tulis perkembangan harian per keluhan dan lihat diagram beban kerja PIC.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Custom styled Google Sign-In Button as mandated in guidelines */}
            <button
              onClick={handleLogin}
              className="gsi-material-button w-full shadow-md hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "4px 16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                height: "46px"
              }}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center justify-center space-x-3">
                <div className="gsi-material-button-icon flex-shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "20px", height: "20px" }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-bold text-gray-700 text-sm">Masuk dengan Akun Google</span>
              </div>
            </button>
            
            <div className="flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Koneksi aman dengan izin Google Drive & Sheets API</span>
            </div>
          </div>
        </div>
        
        {/* Floating Developer/App Credit */}
        <div className="mt-8 text-center text-gray-400 text-xs font-semibold">
          Spreadsheet Customer Feedback Dashboard • v1.0.0
        </div>
      </div>
    );
  }

  // Dashboard - Spreadsheet Selection Screen (If no active Spreadsheet is chosen)
  if (!selectedSpreadsheetId) {
    return (
      <div id="file-selection-screen" className="min-h-screen bg-slate-50 p-6 md:p-12 flex flex-col justify-center items-center">
        <div className="max-w-3xl w-full space-y-6">
          
          {/* User Logged In Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm gap-4">
            <div className="flex items-center space-x-3 text-left">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "Google User"} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full border border-blue-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
                  {user?.displayName?.slice(0, 1) || "U"}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Tersambung sebagai</p>
                <p className="text-sm font-bold text-gray-800">{user?.displayName}</p>
                <p className="text-[10px] text-gray-400 font-mono">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Create New feedback spreadsheet */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">Buat Spreadsheet Baru</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Sistem akan membuat file spreadsheet baru di Google Drive Anda dengan struktur kolom feedback lengkap yang terkonfigurasi otomatis.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Nama File Spreadsheet
                  </label>
                  <div className="relative">
                    <FileSpreadsheet className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Contoh: Database Feedback Pelanggan"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateNewSpreadsheet}
                  disabled={driveLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {driveLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Membuat Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Buat & Hubungkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Box 2: Open existing spreadsheet */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1.5">Buka File yang Ada</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Pilih dari daftar file spreadsheet yang ditemukan di Google Drive Anda atau hubungkan manual menggunakan ID file spreadsheet.
                </p>
              </div>

              {/* List of files */}
              <div className="space-y-4 flex-1 flex flex-col justify-end">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Pilih File Spreadsheet Anda ({spreadsheets.length})
                  </label>
                  
                  {driveLoading ? (
                    <div className="py-6 flex items-center justify-center space-x-2 bg-slate-50 rounded-lg border border-slate-100">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span className="text-xs text-gray-500 font-medium">Memindai Drive...</span>
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Tidak ditemukan file spreadsheet di Drive.
                    </div>
                  ) : (
                    <div className="max-h-[120px] overflow-y-auto border border-gray-150 rounded-lg divide-y divide-gray-100 bg-slate-50/50">
                      {spreadsheets.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleSelectSpreadsheet(file.id, file.name)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50/50 text-xs flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="font-bold text-gray-700 truncate group-hover:text-indigo-600">{file.name}</span>
                          </div>
                          <span className="text-[9px] text-gray-400 flex-shrink-0 ml-2">
                            {new Date(file.modifiedTime).toLocaleDateString("id-ID")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual connect input */}
                <form onSubmit={handleConnectCustomId} className="border-t border-gray-100 pt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Masukkan Spreadsheet ID manual..."
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={driveLoading || !customSheetId.trim()}
                    className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Hubungkan
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* User Feedback Status */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-600 font-medium rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-xs text-emerald-600 font-medium rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active App Dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-150 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Active Connection Title */}
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-gray-900 text-sm tracking-tight truncate max-w-[240px] md:max-w-md">
                  {selectedSpreadsheetTitle}
                </h1>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${selectedSpreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-gray-100 text-gray-400 hover:text-emerald-600 rounded-md transition-all flex items-center gap-0.5"
                  title="Buka Spreadsheet di Google Sheets (Tab Baru)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-gray-400 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-gray-500">Sheet:</span>
                <select
                  value={activeSheetName}
                  onChange={(e) => handleSheetTabChange(e.target.value)}
                  className="bg-transparent border-none text-emerald-600 font-bold hover:underline focus:outline-none focus:ring-0 p-0 text-[10px]"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Navigation Tabs and Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
            
            {/* View Selection Tabs */}
            <div className="bg-gray-100 p-1 rounded-xl flex space-x-1 border border-gray-150 text-xs">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "table"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analitik</span>
              </button>
              <button
                onClick={() => setActiveTab("guide")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "guide"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Panduan</span>
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Pengaturan</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {/* Refresh Action */}
              <button
                onClick={() => loadFeedbackRecords(selectedSpreadsheetId, activeSheetName)}
                disabled={dataLoading}
                className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                title="Sinkronisasi Ulang Data Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? "animate-spin text-blue-500" : ""}`} />
              </button>

              {/* Add Complaint FAB */}
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Feedback Baru</span>
              </button>

              {/* Back to select spreadsheet */}
              <button
                onClick={() => setSelectedSpreadsheetId("")}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-2 rounded-xl border border-gray-150 transition-colors cursor-pointer"
                title="Ganti Spreadsheet File"
              >
                Ganti File
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Floating Global Notifications / Banner */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-600 font-medium rounded-xl flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-xs text-emerald-600 font-medium rounded-xl flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 pb-20">
        
        {dataLoading && complaints.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Membaca data feedback dari Google Sheets...</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Menyiapkan baris, kolom, dan mem-parsing riwayat catatan progres.</p>
          </div>
        ) : (
          <div>
            {/* View: Table Grid with Bento Layout */}
            {activeTab === "table" && (
              <div className="grid grid-cols-12 gap-6">
                
                {/* Bento Quick Stats Grid Row */}
                <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Total Issues Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                      {stats.total}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Keluhan</p>
                      <p className="text-xs font-bold text-slate-700">Tercatat di Sheet</p>
                    </div>
                  </div>

                  {/* Pending Issues Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                      {stats.inProgress}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dalam Proses</p>
                      <p className="text-xs font-bold text-slate-700">Butuh Tindak Lanjut</p>
                    </div>
                  </div>

                  {/* Overdue Issues Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                      {stats.overdue}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Melewati Batas</p>
                      <p className="text-xs font-bold text-slate-700">Tiket Overdue</p>
                    </div>
                  </div>

                  {/* SLA Achievement Card */}
                  <div className="bg-slate-900 p-5 rounded-2xl text-white flex flex-col justify-center shadow-lg border border-slate-800 transition-all hover:border-slate-700">
                    <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-widest">Rasio Penyelesaian</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-extrabold text-indigo-400 leading-none">{stats.resolutionRate}%</p>
                      <p className="text-[10px] font-bold mb-0.5 text-slate-400 uppercase tracking-wider">SLA Achieved</p>
                    </div>
                  </div>

                </div>

                {/* Main Data Table Column (Left 9) */}
                <div className="col-span-12 lg:col-span-9 flex flex-col">
                  <FeedbackTable
                    complaints={complaints}
                    onEditComplaint={openEditModal}
                    onManageNotes={openNotesPanel}
                    selectedComplaintId={selectedComplaint?.id}
                    onSelectComplaint={(c) => setSelectedComplaintId(c.id)}
                    onDeleteComplaint={handleDeleteComplaint}
                  />
                </div>

                {/* Detail View Card Column (Right 3) */}
                <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm justify-between transition-all hover:shadow-md">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase mb-1 tracking-widest">Active Detail</span>
                    <h4 className="font-extrabold text-slate-800 tracking-tight text-sm">
                      {selectedComplaint ? `Detail Keluhan ${selectedComplaint.id}` : "Pilih Tiket Keluhan"}
                    </h4>
                  </div>

                  {selectedComplaint ? (
                    <>
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 flex-1 overflow-y-auto max-h-[160px] min-h-[100px]">
                        <p className="text-[11px] leading-relaxed text-slate-600 italic">
                          "{selectedComplaint.detail || "Tidak ada rincian detail keluhan."}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Deadline</p>
                          <p className={`text-xs font-extrabold ${
                            selectedComplaint && selectedComplaint.status !== ComplaintStatus.RESOLVED && selectedComplaint.deadline && selectedComplaint.deadline < todayStr
                              ? "text-rose-500 animate-pulse"
                              : "text-slate-700"
                          }`}>
                            {selectedComplaint.deadline || "-"}
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sumber</p>
                          <p className="text-xs font-extrabold text-indigo-600 truncate">
                            {selectedComplaint.source || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-100/60 pb-1.5">
                          <span className="text-slate-400 text-[10px] font-medium uppercase">Divisi</span>
                          <span className="font-bold text-slate-700">{selectedComplaint.division || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[10px] font-medium uppercase">PIC Utama</span>
                          <span className="font-bold text-slate-800">{selectedComplaint.pic || "Belum ditunjuk"}</span>
                        </div>
                      </div>

                      {/* Attachments Section */}
                      {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lampiran ({selectedComplaint.attachments.length})</p>
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                            {selectedComplaint.attachments.map((attach, idx) => {
                              const isImage = attach.type.startsWith("image/");
                              return (
                                <a
                                  key={idx}
                                  href={attach.dataUrl}
                                  download={attach.name}
                                  className="flex items-center justify-between p-1.5 bg-white hover:bg-indigo-50 border border-slate-150 rounded-lg text-[10px] font-bold text-slate-700 transition-colors group cursor-pointer"
                                  title={`Unduh ${attach.name}`}
                                >
                                  <div className="flex items-center space-x-1.5 overflow-hidden flex-1 mr-1">
                                    {isImage && attach.dataUrl ? (
                                      <img src={attach.dataUrl} alt={attach.name} className="w-5 h-5 rounded-md object-cover border border-slate-200" />
                                    ) : (
                                      <FileIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    )}
                                    <span className="truncate flex-1 group-hover:text-indigo-600">{attach.name}</span>
                                  </div>
                                  <ArrowDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 flex-shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto flex gap-2">
                        <button
                          onClick={() => openEditModal(selectedComplaint)}
                          className="flex-1 border border-slate-200 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          Ubah Data
                        </button>
                        <button
                          onClick={() => openNotesPanel(selectedComplaint)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Progres Harian
                        </button>
                        <button
                          onClick={() => handleDeleteComplaint(selectedComplaint)}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 cursor-pointer transition-colors"
                          title="Hapus Tiket Keluhan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-medium">Belum ada keluhan terpilih.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Pilih salah satu baris keluhan di tabel master list untuk melihat rincian.</p>
                    </div>
                  )}
                </div>

                {/* Daily Progress / Notes Section (Full width 12 cols) */}
                <div className="col-span-12 bg-slate-900 rounded-2xl p-6 flex flex-col md:flex-row gap-6 border border-slate-800 shadow-md">
                  <div className="w-full md:w-1/4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-6">
                    <h4 className="text-white font-extrabold text-base leading-snug mb-1">Catatan Progres<br/>Harian</h4>
                    <p className="text-slate-400 text-xs font-medium">
                      {selectedComplaint 
                        ? `Sinkronisasi log tiket ${selectedComplaint.id}`
                        : "Pilih tiket untuk melacak progres"
                      }
                    </p>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 py-1">
                    {selectedComplaint && selectedComplaint.notes && selectedComplaint.notes.length > 0 ? (
                      selectedComplaint.notes.slice(-2).map((note, index) => (
                        <div key={index} className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-bold text-indigo-400">{note.date}</span>
                            <span className="text-[10px] text-slate-500">PIC: {selectedComplaint.pic || "Staff"}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed italic line-clamp-3">
                            "{note.text}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 bg-slate-800/20 rounded-xl p-4 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500 italic">
                        Belum ada catatan progres harian untuk tiket ini.
                      </div>
                    )}

                    {selectedComplaint ? (
                      <div 
                        onClick={() => openNotesPanel(selectedComplaint)}
                        className="bg-slate-800/80 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl flex items-center justify-center cursor-pointer transition-all group p-4 min-h-[90px]"
                      >
                        <div className="text-center">
                          <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200">
                            + Tambah Catatan Baru
                          </p>
                          <p className="text-[9px] text-slate-500 group-hover:text-slate-400 mt-0.5">
                            Kirim update riwayat progres
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center p-4">
                        <p className="text-xs text-slate-500">Pilih keluhan terlebih dahulu</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* View: Charts & Analytics */}
            {activeTab === "dashboard" && (
              <StatsDashboard complaints={complaints} />
            )}

            {/* View: Dropdown Lists Configuration (Settings) */}
            {activeTab === "settings" && (
              <SettingsView />
            )}

            {/* View: User Guide / Reference Schema */}
            {activeTab === "guide" && (
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base mb-1">Panduan Kolom & Struktur Spreadsheet</h3>
                  <p className="text-xs text-gray-500">Format skema data yang disinkronisasi langsung pada kolom Google Sheets milik Anda.</p>
                </div>

                <div className="border border-gray-150 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase text-[9px] tracking-wider">
                        <th className="p-3">Kolom Google Sheet</th>
                        <th className="p-3">Tipe Data</th>
                        <th className="p-3">Keterangan / Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">A. Nomor Keluhan</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text (ID)</td>
                        <td className="p-3">Kode unik keluhan, otomatis di-generate menggunakan format <code className="bg-slate-50 border px-1 py-0.5 rounded font-mono text-[10px]">TKT-YYYYMMDD-XXX</code>.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">B. Tanggal</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Date (YYYY-MM-DD)</td>
                        <td className="p-3">Tanggal keluhan pertama kali dilaporkan oleh pelanggan.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">C. Nama Pelanggan</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text</td>
                        <td className="p-3">Nama lengkap pelanggan yang menyampaikan komplain.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">D. Sumber Informasi</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text</td>
                        <td className="p-3">Platform atau kanal pengaduan (e.g., WhatsApp, Email, Call Center, Instagram).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">E. Tipe Keluhan</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text</td>
                        <td className="p-3">Klasifikasi pengaduan (e.g., Kualitas Produk, Pelayanan Staf, Sistem/Aplikasi, Logistik).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">F. Detail Keluhan</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text (Paragraph)</td>
                        <td className="p-3">Deskripsi detail atau kronologi keluhan pelanggan secara lengkap.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">G. Deadline</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Date (YYYY-MM-DD)</td>
                        <td className="p-3">Batas akhir waktu penanganan keluhan berdasarkan komitmen SLA (Service Level Agreement).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">H. Divisi Terkait</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text</td>
                        <td className="p-3">Divisi penanggung jawab penyelesaian masalah (e.g., Finance, Tech Support, Operations).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">I. PIC</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text</td>
                        <td className="p-3">Nama person-in-charge (staf) yang ditunjuk menangani tiket keluhan tersebut.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">J. Status Penyelesaian</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Enum (Status)</td>
                        <td className="p-3">Status pengerjaan keluhan saat ini: <code className="bg-slate-50 border px-1 py-0.5 rounded font-bold text-[10px]">Baru</code>, <code className="bg-slate-50 border px-1 py-0.5 rounded font-bold text-[10px]">Proses</code>, <code className="bg-slate-50 border px-1 py-0.5 rounded font-bold text-[10px]">Selesai</code>, <code className="bg-slate-50 border px-1 py-0.5 rounded font-bold text-[10px]">Ditunda</code>.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">K. Catatan Progres Harian</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text (Serialized Logs)</td>
                        <td className="p-3">
                          Catatan riwayat perkembangan harian, disimpan menggunakan format log terstruktur:<br />
                          <code className="block bg-slate-50 border px-2 py-1 rounded font-mono text-[10px] mt-1 text-gray-600 whitespace-pre-wrap">
                            [2026-07-19 11:15] Refund sedang diproses oleh divisi Keuangan.{"\n"}
                            [2026-07-20 09:30] Masalah selesai. PIC mengonfirmasi solusi dengan pelanggan.
                          </code>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-gray-800">L. Lampiran</td>
                        <td className="p-3 text-blue-600 font-bold font-mono text-[10px]">Text (JSON Attachments)</td>
                        <td className="p-3">
                          Daftar file pendukung atau gambar yang dilampirkan ke detail tiket keluhan, disimpan dalam bentuk JSON terkompresi.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3 text-xs">
                  <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-800">Kepatuhan Integrasi Sheets & Kolaborasi Tim</h4>
                    <p className="text-slate-500 mt-1">
                      Anda dapat mengedit file spreadsheet ini secara mandiri di browser Anda atau membagikannya dengan tim Anda di Google Drive. Aplikasi ini mem-parsing dan menulis ulang data menggunakan API resmi Google Sheets. Sangat disarankan untuk tidak mengubah urutan kolom (A sampai L) agar sinkronisasi pengerjaan berjalan lancar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal component */}
      <ComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveComplaint}
        complaint={editingComplaint}
        existingComplaints={complaints}
      />

      {/* Notes timeline Panel component */}
      <NotesPanel
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        complaint={activeNotesComplaint}
        onAddNote={handleAddProgressNote}
      />

      {/* Custom Mutation Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="absolute inset-0 cursor-default" onClick={() => {
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            if (confirmState.onCancel) confirmState.onCancel();
          }} />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-150 flex flex-col space-y-4 z-10 animate-scale-up">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">{confirmState.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  if (confirmState.onCancel) confirmState.onCancel();
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  confirmState.onConfirm();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
