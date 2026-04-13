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

      // --- locate header row: find "Грузополучатель" and "Количество" ---
      let headerRowIdx = -1;
      let recipientColIdx = -1;
      let quantityColIdx = -1;

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        let foundRecipient = false;
        let foundQuantity = false;

        for (let c = 0; c < row.length; c++) {
          const text = String(row[c]).trim();
          if (text.includes('Грузополучатель') && recipientColIdx === -1) {
            recipientColIdx = c;
            foundRecipient = true;
          }
          if (text.includes('Количество') && quantityColIdx === -1) {
            quantityColIdx = c;
            foundQuantity = true;
          }
        }

        if (foundRecipient || foundQuantity) {
          headerRowIdx = r;
        }

        // stop once we have both columns
        if (recipientColIdx !== -1 && quantityColIdx !== -1) break;
      }

      if (headerRowIdx === -1 || recipientColIdx === -1 || quantityColIdx === -1) {
        res.status(400).json({
          message: 'Cannot find "Грузополучатель" / "Количество" columns in the file',
        });
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
