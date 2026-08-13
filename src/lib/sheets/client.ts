/**
 * Cliente de solo lectura para Google Sheets vía service account (JWT).
 * Trae los valores crudos del rango configurado; el parseo al modelo de
 * dominio vive en @/lib/skills/parse.
 */
import { google } from "googleapis";
import type { GoogleSheetsConfig } from "./config";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

/** Filas crudas del rango (incluye la fila de encabezados en [0]). */
export async function fetchSheetRows(cfg: GoogleSheetsConfig): Promise<string[][]> {
  const auth = new google.auth.JWT({
    email: cfg.serviceAccountEmail,
    key: cfg.privateKey,
    scopes: SCOPES,
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: cfg.range,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values ?? []) as string[][];
}
