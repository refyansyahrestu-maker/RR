/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgressLog {
  date: string; // YYYY-MM-DD HH:mm
  text: string;
}

export interface Attachment {
  name: string;
  type: string; // MIME type
  size: number; // in bytes
  dataUrl?: string; // base64 string for preview/download
}

export interface Complaint {
  id: string; // Ticket No: e.g. TKT-20260719-001
  date: string; // YYYY-MM-DD
  customerName: string;
  source: string; // WhatsApp, Email, Instagram, Google Maps, dll
  type: string; // Pelayanan, Produk, Sistem, dll
  detail: string;
  deadline: string; // YYYY-MM-DD
  division: string; // CS, Tech, Finance, Marketing, Operations, dll
  pic: string;
  status: ComplaintStatus;
  notes: ProgressLog[]; // Parsed from/to the spreadsheet cell
  attachments?: Attachment[]; // Parsed from/to spreadsheet column L (JSON)
  rowIndex?: number; // Row index in the spreadsheet (2-indexed, since row 1 is header)
}

export enum ComplaintStatus {
  OPEN = "Baru",
  IN_PROGRESS = "Proses",
  RESOLVED = "Selesai",
  PENDING = "Ditunda",
}

export const SOURCES = [
  "WhatsApp",
  "Email",
  "Call Center",
  "Instagram",
  "Twitter/X",
  "Google Maps",
  "Website Form",
  "Direct (Walk-in)"
];

export const COMPLAINT_TYPES = [
  "Kualitas Produk",
  "Pelayanan Staf",
  "Sistem / Aplikasi / IT",
  "Logistik / Pengiriman",
  "Tagihan / Pembayaran",
  "Lainnya"
];

export const DIVISIONS = [
  "Customer Service",
  "Operations / Logistik",
  "Finance & Accounting",
  "IT & Tech Support",
  "Marketing & Sales",
  "Product Quality Control",
  "Legal & Management"
];

export const PIC_LIST = [
  "Andi Wijaya (CS Manager)",
  "Budi Santoso (Tech Lead)",
  "Chandra Kirana (Finance Exec)",
  "Dian Pratama (Ops Head)",
  "Eka Saputra (QC Lead)",
  "Fitriani (Marketing Specialist)",
  "Grace Natalia (Legal Counsel)",
  "Hadi Suwarno (Support Senior)"
];
