/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Complaint, ComplaintStatus, ProgressLog } from "../types";

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

// Parse string from Google Sheet cell back into structured ProgressLog array
export function deserializeNotes(text: string | null | undefined): ProgressLog[] {
  if (!text) return [];
  const lines = text.split("\n");
  const logs: ProgressLog[] = [];
  const regex = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] (.*)$/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(regex);
    if (match) {
      logs.push({
        date: match[1],
        text: match[2]
      });
    } else {
      // Fallback: Use current date or a default structure
      logs.push({
        date: "",
        text: trimmed
      });
    }
  }
  return logs;
}

// Convert structured ProgressLog array to text for saving to Google Sheet cell
export function serializeNotes(notes: ProgressLog[]): string {
  return notes
    .map(n => `[${n.date}] ${n.text}`)
    .join("\n");
}

// 1. List Spreadsheet Files in Google Drive
export async function listSpreadsheets(accessToken: string): Promise<DriveFile[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,modifiedTime)&orderBy=modifiedTime+desc&pageSize=40`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list spreadsheets: ${res.statusText} (${errText})`);
  }
  
  const data = await res.json();
  return data.files || [];
}

// 2. Create a brand new Google Sheet
export async function createFeedbackSpreadsheet(accessToken: string, title: string): Promise<string> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: { title: "Feedback Pelanggan" }
        }
      ]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create spreadsheet: ${res.statusText} (${errText})`);
  }
  
  const data = await res.json();
  return data.spreadsheetId;
}

// 3. Initialize Spreadsheet headers
export async function initializeHeaders(accessToken: string, spreadsheetId: string, sheetName: string): Promise<void> {
  const range = `${sheetName}!A1:L1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const headers = [
    "Nomor Keluhan",
    "Tanggal",
    "Nama Pelanggan",
    "Sumber Informasi",
    "Tipe Keluhan",
    "Detail Keluhan",
    "Deadline",
    "Divisi Terkait",
    "PIC",
    "Status Penyelesaian",
    "Catatan Progres Harian",
    "Lampiran"
  ];
  
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [headers]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to initialize spreadsheet headers: ${res.statusText} (${errText})`);
  }
}

// 4. Get Sheet list and details of a Spreadsheet
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<{ id: string; title: string; sheets: string[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch spreadsheet details: ${res.statusText} (${errText})`);
  }
  
  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties.title as string);
  
  return {
    id: data.spreadsheetId,
    title: data.properties.title,
    sheets
  };
}

// 5. Read all complaint records from a sheet
export async function fetchFeedbackRecords(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<Complaint[]> {
  // Fetch up to 2000 rows, including column L (12th column) for Attachments
  const range = `${sheetName}!A1:L2000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch feedback records: ${res.statusText} (${errText})`);
  }
  
  const data = await res.json();
  const rows: string[][] = data.values || [];
  
  if (rows.length === 0) {
    return [];
  }
  
  // Verify headers or format. Row 1 is header.
  const records: Complaint[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Fill empty cells with empty string to prevent index errors
    const id = row[0] || "";
    if (!id.trim()) continue; // Skip empty rows
    
    const date = row[1] || "";
    const customerName = row[2] || "";
    const source = row[3] || "";
    const type = row[4] || "";
    const detail = row[5] || "";
    const deadline = row[6] || "";
    const division = row[7] || "";
    const pic = row[8] || "";
    const statusText = row[9] || ComplaintStatus.OPEN;
    const progressNotesText = row[10] || "";
    const attachmentsText = row[11] || "";
    
    // Map Indonesian status to Enum or fall back
    let status = ComplaintStatus.OPEN;
    if (statusText === "Proses" || statusText === "In Progress") status = ComplaintStatus.IN_PROGRESS;
    else if (statusText === "Selesai" || statusText === "Resolved") status = ComplaintStatus.RESOLVED;
    else if (statusText === "Ditunda" || statusText === "Pending") status = ComplaintStatus.PENDING;
    else status = ComplaintStatus.OPEN;
    
    // Parse attachments from JSON
    let attachments: any[] = [];
    if (attachmentsText.trim()) {
      try {
        attachments = JSON.parse(attachmentsText);
      } catch (e) {
        console.warn("Failed to parse attachments JSON for row", i, e);
      }
    }
    
    records.push({
      id,
      date,
      customerName,
      source,
      type,
      detail,
      deadline,
      division,
      pic,
      status,
      notes: deserializeNotes(progressNotesText),
      attachments,
      rowIndex: i + 1 // 1-based indexing for sheets (header is row 1, first data row is row 2)
    });
  }
  
  return records;
}

// 6. Append a new complaint record
export async function appendFeedbackRecord(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  complaint: Omit<Complaint, "rowIndex">
): Promise<void> {
  const range = `${sheetName}!A:L`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  
  const rowData = [
    complaint.id,
    complaint.date,
    complaint.customerName,
    complaint.source,
    complaint.type,
    complaint.detail,
    complaint.deadline,
    complaint.division,
    complaint.pic,
    complaint.status,
    serializeNotes(complaint.notes),
    JSON.stringify(complaint.attachments || [])
  ];
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [rowData]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to append feedback record: ${res.statusText} (${errText})`);
  }
}

// 7. Update an existing complaint record by row index
export async function updateFeedbackRecord(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  complaint: Complaint
): Promise<void> {
  if (!complaint.rowIndex) {
    throw new Error("Cannot update record: missing sheet row index.");
  }
  
  const range = `${sheetName}!A${complaint.rowIndex}:L${complaint.rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const rowData = [
    complaint.id,
    complaint.date,
    complaint.customerName,
    complaint.source,
    complaint.type,
    complaint.detail,
    complaint.deadline,
    complaint.division,
    complaint.pic,
    complaint.status,
    serializeNotes(complaint.notes),
    JSON.stringify(complaint.attachments || [])
  ];
  
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: [rowData]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update feedback record: ${res.statusText} (${errText})`);
  }
}

// 8. Delete an existing complaint record by row index
export async function deleteFeedbackRecord(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number
): Promise<void> {
  // First, fetch the spreadsheet details to find the sheetId for the sheetName
  const detailsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!detailsRes.ok) {
    const errText = await detailsRes.text();
    throw new Error(`Failed to fetch spreadsheet details: ${detailsRes.statusText} (${errText})`);
  }
  
  const detailsData = await detailsRes.json();
  const matchedSheet = (detailsData.sheets || []).find(
    (s: any) => s.properties.title === sheetName
  );
  
  if (!matchedSheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet.`);
  }
  
  const sheetId = matchedSheet.properties.sheetId;
  
  // Now, call batchUpdate to delete the row dimension
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(updateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex - 1, // 0-based index inclusive
              endIndex: rowIndex // 0-based index exclusive
            }
          }
        }
      ]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete row in spreadsheet: ${res.statusText} (${errText})`);
  }
}

