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

// Detects street-type keywords anywhere in a string (handles both
// "вулиця Назва" and "Назва вулиця" orderings used by Nominatim).
const STREET_TYPE_RE =
  /вулиця|вул\.?|бульвар|б-р\.?|проспект|просп\.?|провулок|пров\.?|площа|пл\.?|шосе|набережна/i;

// House/unit number: starts with a digit, optionally followed by dash/slash
// suffix (e.g. "54", "1-П" → "1п", "13/146"). Max 10 chars to exclude long parts.
const HOUSE_NUM_RE = /^\d+([-\/][\dа-яіїєґa-z]+)*$/i;

// Normalise a string for token matching:
//   • remove street-type keywords
//   • collapse hyphens so "1-П" → "1п" (becomes a 2-char token, not two 1-char tokens)
//   • strip all remaining punctuation/special chars
const normalizeStr = (s: string): string =>
  s
    .toLowerCase()
    .replace(STREET_TYPE_RE, ' ')
    .replace(/-/g, '') // join hyphenated parts: "1-П"→"1п", "10-й"→"10й"
    .replace(/[^а-яіїєґa-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Build a precise token set from a Nominatim address by targeting only the
// parts that reliably appear in Excel recipient strings:
//
//   • Part containing a street-type keyword  → street name tokens
//   • Short digit-starting part              → house/unit number token
//   • First part (POI/amenity name)          → tokens ≥ 4 chars only
//   • Everything else (neighbourhood, city, oblast, country) is skipped
//
// Examples:
//   "Адоніс №8, 1-П, Армійська вулиця, Володарка, ..."
//     → ["адоніс", "1п", "армійська"]           (POI + house + street)
//   "54, вулиця Ревуцького, 10-й мікрорайон Осокорків, ..."
//     → ["54", "ревуцького"]                     (house + street; neighbourhood skipped)
const extractMatchTokens = (address: string): string[] => {
  const parts = address.split(',').map((p) => p.trim()).slice(0, 6);
  const tokens: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // ── Street name part ────────────────────────────────────────────────
    if (STREET_TYPE_RE.test(part)) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 2));
      continue;
    }

    // ── House / unit number part ────────────────────────────────────────
    const stripped = part.replace(/\s+/g, '');
    if (stripped.length >= 1 && stripped.length <= 10 && HOUSE_NUM_RE.test(stripped)) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 2));
      continue;
    }

    // ── POI / amenity name (first part only, substantive tokens ≥ 4 chars) ──
    if (i === 0) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 4));
    }
    // All other parts (neighbourhood, district, city, oblast, country) → skip
  }

  return [...new Set(tokens)];
};

const matchesAnyAddress = (recipient: string, savedAddresses: string[]): boolean => {
  const normRecipient = normalizeStr(recipient);
  return savedAddresses.some((addr) => {
    const tokens = extractMatchTokens(addr);
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
