import { Router, Request, Response } from 'express';
import multer from 'multer';
// xlsx is the only library that handles both legacy .xls (BIFF) and .xlsx (OOXML).
// exceljs only supports .xlsx. No patched xlsx release exists; risk is acceptable
// for an internal authenticated service — mitigated by disabling formula/HTML parsing.
import * as XLSX from 'xlsx';

import { protect, AuthRequest } from '../middleware/auth';
import { UserAddresses } from '../models/UserAddresses';
import { UserBrands } from '../models/UserBrands';

export const documentRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

export interface RecipientRow {
  recipient: string;
  quantity: number;
}

export interface FilteredBrand {
  brand: string;
  quantity: number;
  recipients: RecipientRow[];
}

// ── Address matching ────────────────────────────────────────────────────────

const STREET_TYPE_RE =
  /вулиця|вул\.?|бульвар|б-р\.?|проспект|просп\.?|провулок|пров\.?|площа|пл\.?|шосе|набережна/i;

const HOUSE_NUM_RE = /^\d+([-\/][\dа-яіїєґa-z]+)*$/i;

const normalizeStr = (s: string): string =>
  s
    .toLowerCase()
    .replace(STREET_TYPE_RE, ' ')
    .replace(/-/g, '')
    .replace(/[^а-яіїєґa-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractMatchTokens = (address: string): string[] => {
  const parts = address.split(',').map((p) => p.trim()).slice(0, 6);
  const tokens: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (STREET_TYPE_RE.test(part)) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 2));
      continue;
    }

    const stripped = part.replace(/\s+/g, '');
    if (stripped.length >= 1 && stripped.length <= 10 && HOUSE_NUM_RE.test(stripped)) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 2));
      continue;
    }

    if (i === 0) {
      tokens.push(...normalizeStr(part).split(' ').filter((t) => t.length >= 4));
    }
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

// ── Brand matching ──────────────────────────────────────────────────────────
// A product row matches a saved brand if the brand name appears as a
// case-insensitive substring of the product row text.
const matchesBrand = (productRow: string, savedBrands: string[]): boolean =>
  savedBrands.some((b) => productRow.toLowerCase().includes(b.trim().toLowerCase()));

// ── Route ───────────────────────────────────────────────────────────────────

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

      const userId = (req as AuthRequest).user._id;

      // --- load saved addresses and brands for this user ---
      const [addressDoc, brandsDoc] = await Promise.all([
        UserAddresses.findOne({ userId }),
        UserBrands.findOne({ userId }),
      ]);

      const savedAddresses = (addressDoc?.addresses ?? []).map((a) => a.address);
      const savedBrands = (brandsDoc?.brands ?? []).map((b) => b.brand);

      if (savedAddresses.length === 0 || savedBrands.length === 0) {
        res.json({ brands: [] });
        return;
      }

      // --- parse workbook (both .xls and .xlsx) ---
      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer',
        cellFormula: false,
        cellHTML: false,
      });

      if (!workbook.SheetNames.length) {
        res.status(400).json({ message: 'No worksheet found in the file' });
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
        workbook.Sheets[workbook.SheetNames[0]],
        { header: 1, defval: '' },
      );

      // --- locate header row ---
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

      if (quantityColIdx === recipientColIdx) {
        res.status(400).json({
          message: 'Recipient and quantity columns resolved to the same index — check file structure',
        });
        return;
      }

      // --- parse rows into brand groups ---
      // Rows NOT starting with "*" are brand/product header rows.
      // Rows starting with "*" are recipient (грузополучатель) rows under the current brand.
      const allGroups: Array<{ brand: string; quantity: number; recipients: RecipientRow[] }> = [];
      let currentGroup: (typeof allGroups)[0] | null = null;

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        const cellText = String(row[recipientColIdx] ?? '').trim();
        if (!cellText) continue;

        const rawQty = row[quantityColIdx];
        const quantity =
          typeof rawQty === 'number'
            ? rawQty
            : parseFloat(String(rawQty).replace(',', '.')) || 0;

        if (cellText.startsWith('*')) {
          // recipient row — attach to the current brand group
          if (currentGroup) {
            currentGroup.recipients.push({ recipient: cellText, quantity });
          }
        } else {
          // brand/product header row — start a new group
          if (currentGroup) allGroups.push(currentGroup);
          currentGroup = { brand: cellText, quantity, recipients: [] };
        }
      }
      if (currentGroup) allGroups.push(currentGroup);

      // --- filter: brand match → address match within brand ---
      const filteredBrands: FilteredBrand[] = allGroups
        .filter((g) => matchesBrand(g.brand, savedBrands))
        .map((g) => ({
          ...g,
          recipients: g.recipients.filter((r) => matchesAnyAddress(r.recipient, savedAddresses)),
        }))
        .filter((g) => g.recipients.length > 0);

      res.json({ brands: filteredBrands });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  },
);
