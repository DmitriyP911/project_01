import { Router, Request, Response } from 'express';
import multer from 'multer';
// xlsx is the only library that handles both legacy .xls (BIFF) and .xlsx (OOXML).
// exceljs only supports .xlsx. No patched xlsx release exists; risk is acceptable
// for an internal authenticated service — mitigated by disabling formula/HTML parsing.
import * as XLSX from 'xlsx';

import { protect, AuthRequest } from '../middleware/auth';
import { UserAddresses } from '../models/UserAddresses';

export const documentRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

export interface DocumentRow {
  recipient: string;
  quantity: number;
}

// Strips Ukrainian street-type prefixes, punctuation and extra whitespace so that
// "вул.Хрещатик" and "вулиця Хрещатик" both normalise to "хрещатик".
const normalizeStr = (s: string): string =>
  s
    .toLowerCase()
    .replace(
      /\b(вулиця|вул\.?|бульвар|б-р\.?|проспект|просп\.?|пр\.?|провулок|пров\.?|площа|пл\.?|шосе|ш\.?)\b/g,
      ' ',
    )
    .replace(/[^а-яіїєґa-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Takes the first two comma-parts of a saved Nominatim address (street + house number),
// tokenises them, and requires every token to appear in the normalised recipient string.
const matchesAnyAddress = (recipient: string, savedAddresses: string[]): boolean => {
  const normRecipient = normalizeStr(recipient);
  return savedAddresses.some((addr) => {
    const keyPart = addr.split(',').slice(0, 2).join(' ');
    const tokens = normalizeStr(keyPart)
      .split(' ')
      .filter((t) => t.length >= 2);
    if (tokens.length === 0) return false;
    return tokens.every((t) => normRecipient.includes(t));
  });
};

// POST /api/document  (protected, multipart/form-data, field: "file")
documentRouter.post(
  '/document',
  protect,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'XLS/XLSX file is required (field name: file)' });
        return;
      }

      // --- fetch saved addresses for this user ---
      const userId = (req as AuthRequest).user._id;
      const doc = await UserAddresses.findOne({ userId });
      const savedAddresses = (doc?.addresses ?? []).map((a) => a.address);

      if (savedAddresses.length === 0) {
        res.json({ rows: [] });
        return;
      }

      // --- parse workbook (both .xls and .xlsx) ---
      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer',
        cellFormula: false, // mitigate ReDoS / formula-injection CVEs
        cellHTML: false,
      });

      if (!workbook.SheetNames.length) {
        res.status(400).json({ message: 'No worksheet found in the file' });
        return;
      }

      // sheet_to_json with header:1 → every row is an array of cell values
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
        workbook.Sheets[workbook.SheetNames[0]],
        { header: 1, defval: '' },
      );

      // --- locate header row ---
      // Step 1: find the row that contains "Грузополучатель" — that is the true
      // column header row. We must NOT search for "Количество" globally because
      // the metadata rows (e.g. "Показатели: Количество (в единицах хранения)")
      // appear earlier in the file and would give a wrong column index.
      let headerRowIdx = -1;
      let recipientColIdx = -1;
      let quantityColIdx = -1;

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        for (let c = 0; c < row.length; c++) {
          if (String(row[c]).trim().includes('Грузополучатель')) {
            headerRowIdx = r;
            recipientColIdx = c;
            break;
          }
        }
        if (headerRowIdx !== -1) break;
      }

      if (headerRowIdx === -1 || recipientColIdx === -1) {
        res.status(400).json({ message: 'Cannot find "Грузополучатель" column in the file' });
        return;
      }

      // Step 2: find "Количество" starting from the header row (look up to 2 rows
      // ahead to cover multi-row merged header cells).
      for (let r = headerRowIdx; r <= Math.min(headerRowIdx + 2, rawRows.length - 1); r++) {
        const row = rawRows[r];
        for (let c = 0; c < row.length; c++) {
          if (String(row[c]).trim().includes('Количество')) {
            quantityColIdx = c;
            break;
          }
        }
        if (quantityColIdx !== -1) break;
      }

      if (quantityColIdx === -1) {
        res.status(400).json({ message: 'Cannot find "Количество" column in the file' });
        return;
      }

      // Sanity check: both columns must differ
      if (quantityColIdx === recipientColIdx) {
        res.status(400).json({ message: 'Recipient and quantity columns resolved to the same index — check file structure' });
        return;
      }

      // --- filter data rows ---
      const rows: DocumentRow[] = [];

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        const recipient = String(row[recipientColIdx] ?? '').trim();
        const rawQty = row[quantityColIdx];
        const quantity =
          typeof rawQty === 'number'
            ? rawQty
            : parseFloat(String(rawQty).replace(',', '.')) || 0;

        if (!recipient || quantity === 0) continue;

        if (matchesAnyAddress(recipient, savedAddresses)) {
          rows.push({ recipient, quantity });
        }
      }

      res.json({ rows });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  },
);
