/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  SOURCES, 
  COMPLAINT_TYPES, 
  DIVISIONS, 
  PIC_LIST 
} from "../types";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  RotateCcw, 
  Settings, 
  ListPlus, 
  User, 
  Building2, 
  Radio 
} from "lucide-react";

interface SettingsViewProps {
  onListsChanged?: () => void;
}

export default function SettingsView({ onListsChanged }: SettingsViewProps) {
  // Option lists states
  const [sources, setSources] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [pics, setPics] = useState<string[]>([]);

  // Add inputs state
  const [newSource, setNewSource] = useState("");
  const [newType, setNewType] = useState("");
  const [newDivision, setNewDivision] = useState("");
  const [newPic, setNewPic] = useState("");

  // Editing state trackers
  const [editingIndex, setEditingIndex] = useState<{ listName: string; index: number } | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Load lists from localStorage
  useEffect(() => {
    loadAllLists();
  }, []);

  const loadAllLists = () => {
    // 1. Sources
    const savedSources = localStorage.getItem("sheet_complaint_sources");
    if (savedSources) {
      try { setSources(JSON.parse(savedSources)); } catch (e) { setSources(SOURCES); }
    } else {
      setSources(SOURCES);
    }

    // 2. Types
    const savedTypes = localStorage.getItem("sheet_complaint_types");
    if (savedTypes) {
      try { setTypes(JSON.parse(savedTypes)); } catch (e) { setTypes(COMPLAINT_TYPES); }
    } else {
      setTypes(COMPLAINT_TYPES);
    }

    // 3. Divisions
    const savedDivisions = localStorage.getItem("sheet_complaint_divisions");
    if (savedDivisions) {
      try { setDivisions(JSON.parse(savedDivisions)); } catch (e) { setDivisions(DIVISIONS); }
    } else {
      setDivisions(DIVISIONS);
    }

    // 4. PICs
    const savedPics = localStorage.getItem("sheet_complaint_pics");
    if (savedPics) {
      try { setPics(JSON.parse(savedPics)); } catch (e) { setPics(PIC_LIST); }
    } else {
      setPics(PIC_LIST);
    }
  };

  const saveList = (key: string, data: string[]) => {
    localStorage.setItem(key, JSON.stringify(data));
    if (onListsChanged) onListsChanged();
  };

  // Add handlers
  const handleAddItem = (listName: "sources" | "types" | "divisions" | "pics") => {
    let value = "";
    let currentList: string[] = [];
    let localStorageKey = "";
    let setter: React.Dispatch<React.SetStateAction<string[]>> = () => {};
    let resetInput: React.Dispatch<React.SetStateAction<string>> = () => {};

    if (listName === "sources") {
      value = newSource.trim();
      currentList = sources;
      localStorageKey = "sheet_complaint_sources";
      setter = setSources;
      resetInput = setNewSource;
    } else if (listName === "types") {
      value = newType.trim();
      currentList = types;
      localStorageKey = "sheet_complaint_types";
      setter = setTypes;
      resetInput = setNewType;
    } else if (listName === "divisions") {
      value = newDivision.trim();
      currentList = divisions;
      localStorageKey = "sheet_complaint_divisions";
      setter = setDivisions;
      resetInput = setNewDivision;
    } else if (listName === "pics") {
      value = newPic.trim();
      currentList = pics;
      localStorageKey = "sheet_complaint_pics";
      setter = setPics;
      resetInput = setNewPic;
    }

    if (!value) return;

    if (currentList.includes(value)) {
      alert("Opsi ini sudah terdaftar di dalam list.");
      return;
    }

    const updated = [...currentList, value];
    setter(updated);
    saveList(localStorageKey, updated);
    resetInput("");
  };

  // Delete handlers
  const handleDeleteItem = (listName: "sources" | "types" | "divisions" | "pics", indexToDelete: number) => {
    let currentList: string[] = [];
    let localStorageKey = "";
    let setter: React.Dispatch<React.SetStateAction<string[]>> = () => {};

    if (listName === "sources") {
      currentList = sources;
      localStorageKey = "sheet_complaint_sources";
      setter = setSources;
    } else if (listName === "types") {
      currentList = types;
      localStorageKey = "sheet_complaint_types";
      setter = setTypes;
    } else if (listName === "divisions") {
      currentList = divisions;
      localStorageKey = "sheet_complaint_divisions";
      setter = setDivisions;
    } else if (listName === "pics") {
      currentList = pics;
      localStorageKey = "sheet_complaint_pics";
      setter = setPics;
    }

    const updated = currentList.filter((_, idx) => idx !== indexToDelete);
    setter(updated);
    saveList(localStorageKey, updated);
    
    // Reset editing state if deleting the active editing item
    if (editingIndex?.listName === listName && editingIndex?.index === indexToDelete) {
      setEditingIndex(null);
    }
  };

  // Inline editing handlers
  const startEditing = (listName: string, index: number, currentValue: string) => {
    setEditingIndex({ listName, index });
    setEditingValue(currentValue);
  };

  const handleSaveEdit = (listName: "sources" | "types" | "divisions" | "pics", indexToSave: number) => {
    const trimmedVal = editingValue.trim();
    if (!trimmedVal) return;

    let currentList: string[] = [];
    let localStorageKey = "";
    let setter: React.Dispatch<React.SetStateAction<string[]>> = () => {};

    if (listName === "sources") {
      currentList = sources;
      localStorageKey = "sheet_complaint_sources";
      setter = setSources;
    } else if (listName === "types") {
      currentList = types;
      localStorageKey = "sheet_complaint_types";
      setter = setTypes;
    } else if (listName === "divisions") {
      currentList = divisions;
      localStorageKey = "sheet_complaint_divisions";
      setter = setDivisions;
    } else if (listName === "pics") {
      currentList = pics;
      localStorageKey = "sheet_complaint_pics";
      setter = setPics;
    }

    const updated = currentList.map((val, idx) => idx === indexToSave ? trimmedVal : val);
    setter(updated);
    saveList(localStorageKey, updated);
    setEditingIndex(null);
  };

  // Reset to default template handlers
  const handleResetToDefault = (listName: "sources" | "types" | "divisions" | "pics" | "all") => {
    const confirmed = window.confirm(
      listName === "all" 
        ? "Apakah Anda yakin ingin meriset semua list opsi kembali ke template default bawaan sistem?"
        : "Apakah Anda yakin ingin meriset list ini kembali ke template default bawaan sistem?"
    );
    if (!confirmed) return;

    if (listName === "sources" || listName === "all") {
      setSources(SOURCES);
      localStorage.removeItem("sheet_complaint_sources");
    }
    if (listName === "types" || listName === "all") {
      setTypes(COMPLAINT_TYPES);
      localStorage.removeItem("sheet_complaint_types");
    }
    if (listName === "divisions" || listName === "all") {
      setDivisions(DIVISIONS);
      localStorage.removeItem("sheet_complaint_divisions");
    }
    if (listName === "pics" || listName === "all") {
      setPics(PIC_LIST);
      localStorage.removeItem("sheet_complaint_pics");
    }

    if (onListsChanged) {
      // Trigger update with a delay to ensure localStorage deletes complete
      setTimeout(() => onListsChanged(), 50);
    }
  };

  return (
    <div className="space-y-8" id="settings-view-panel">
      {/* Settings Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Kustomisasi Opsi Form</h2>
            <p className="text-xs text-slate-400">Atur, tambah, atau ubah sendiri list Sumber, Tipe, Divisi, dan PIC yang ingin Anda gunakan.</p>
          </div>
        </div>
        
        <button
          onClick={() => handleResetToDefault("all")}
          className="flex items-center space-x-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start md:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Semua ke Default</span>
        </button>
      </div>

      {/* Main Grid for 4 lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Sumber Informasi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Sumber Informasi</h3>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">{sources.length} Opsi</span>
            </div>

            {/* Scrollable list */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto mb-4 pr-1">
              {sources.map((srcItem, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs font-semibold text-slate-700">
                  {editingIndex?.listName === "sources" && editingIndex?.index === idx ? (
                    <div className="flex items-center gap-2 w-full pr-1">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-white border border-indigo-200 px-2 py-1 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit("sources", idx)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingIndex(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{srcItem}</span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => startEditing("sources", idx, srcItem)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Ubah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem("sources", idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem("sources"); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah sumber baru..."
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <button
              onClick={() => handleResetToDefault("sources")}
              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Reset List Ini ke Bawaan
            </button>
          </div>
        </div>

        {/* Card 2: Tipe Keluhan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <ListPlus className="w-4 h-4 text-indigo-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Tipe Keluhan</h3>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{types.length} Opsi</span>
            </div>

            {/* Scrollable list */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto mb-4 pr-1">
              {types.map((typeItem, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs font-semibold text-slate-700">
                  {editingIndex?.listName === "types" && editingIndex?.index === idx ? (
                    <div className="flex items-center gap-2 w-full pr-1">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-white border border-indigo-200 px-2 py-1 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit("types", idx)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingIndex(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{typeItem}</span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => startEditing("types", idx, typeItem)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Ubah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem("types", idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem("types"); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah tipe baru..."
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <button
              onClick={() => handleResetToDefault("types")}
              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Reset List Ini ke Bawaan
            </button>
          </div>
        </div>

        {/* Card 3: Divisi Terkait */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Divisi Terkait</h3>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{divisions.length} Opsi</span>
            </div>

            {/* Scrollable list */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto mb-4 pr-1">
              {divisions.map((divItem, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs font-semibold text-slate-700">
                  {editingIndex?.listName === "divisions" && editingIndex?.index === idx ? (
                    <div className="flex items-center gap-2 w-full pr-1">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-white border border-indigo-200 px-2 py-1 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit("divisions", idx)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingIndex(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{divItem}</span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => startEditing("divisions", idx, divItem)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Ubah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem("divisions", idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem("divisions"); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah divisi baru..."
                value={newDivision}
                onChange={(e) => setNewDivision(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <button
              onClick={() => handleResetToDefault("divisions")}
              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Reset List Ini ke Bawaan
            </button>
          </div>
        </div>

        {/* Card 4: PIC (Person In Charge) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-rose-500" />
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">PIC (Person In Charge)</h3>
              </div>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">{pics.length} Staff</span>
            </div>

            {/* Scrollable list */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto mb-4 pr-1">
              {pics.map((picItem, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100/60 text-xs font-semibold text-slate-700">
                  {editingIndex?.listName === "pics" && editingIndex?.index === idx ? (
                    <div className="flex items-center gap-2 w-full pr-1">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 bg-white border border-indigo-200 px-2 py-1 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit("pics", idx)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingIndex(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{picItem}</span>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => startEditing("pics", idx, picItem)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Ubah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem("pics", idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <form onSubmit={(e) => { e.preventDefault(); handleAddItem("pics"); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Tambah PIC / Jabatan..."
                value={newPic}
                onChange={(e) => setNewPic(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
            <button
              onClick={() => handleResetToDefault("pics")}
              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Reset List Ini ke Bawaan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
