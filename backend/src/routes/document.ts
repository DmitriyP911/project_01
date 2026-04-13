import { Router, Request, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';

import { protect, AuthRequest } from '../middleware/auth';
import { UserAddresses } from '../models/UserAddresses';

export const documentRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

export interface DocumentRow {
  recipient: string;
  quantity: number;
}

// Strips Ukrainian street-type abbreviations, punctuation, and extra spaces
// so "вул.Хрещатик" and "вулиця Хрещатик" both normalize to "хрещатик"
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

// Checks whether the Excel recipient row matches any saved address.
// Strategy: take the first two comma-parts of the saved address (street + house number),
// tokenize them, and require every token to appear in the normalized recipient string.
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

// POST /api/document  (protected, multipart/form-data, field name: "file")
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

      // --- load saved addresses for this user ---
      const userId = (req as AuthRequest).user._id;
      const doc = await UserAddresses.findOne({ userId });
      const savedAddresses = (doc?.addresses ?? []).map((a) => a.address);

      if (savedAddresses.length === 0) {
        res.json({ rows: [] });
        return;
      }

      // --- parse the workbook ---
      const workbook = new ExcelJS.Workbook();
      const stream = Readable.from(req.file.buffer);
      await workbook.xlsx.read(stream);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        res.status(400).json({ message: 'No worksheet found in the file' });
        return;
      }

      // --- find the header row (contains "Грузополучатель") ---
      let headerRowNumber = -1;
      let recipientColNumber = -1;
      let quantityColNumber = -1;

      worksheet.eachRow((row, rowNumber) => {
        if (headerRowNumber !== -1) return;

        row.eachCell((cell, colNumber) => {
          const text = String(cell.value ?? '').trim();
          if (text.includes('Грузополучатель')) {
            headerRowNumber = rowNumber;
            recipientColNumber = colNumber;
          }
          if (text.includes('Количество')) {
            quantityColNumber = colNumber;
          }
        });
      });

      if (headerRowNumber === -1 || recipientColNumber === -1 || quantityColNumber === -1) {
        res.status(400).json({ message: 'Cannot find "Грузополучатель" / "Количество" columns in the file' });
        return;
      }

      // --- collect matching rows ---
      const rows: DocumentRow[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return;

        const recipientCell = row.getCell(recipientColNumber);
        const quantityCell = row.getCell(quantityColNumber);

        const recipient = String(
          recipientCell.value ?? recipientCell.text ?? '',
        ).trim();

        const rawQty = quantityCell.value;
        const quantity =
          typeof rawQty === 'number'
            ? rawQty
            : parseFloat(String(rawQty ?? '').replace(',', '.')) || 0;

        if (!recipient || quantity === 0) return;

        if (matchesAnyAddress(recipient, savedAddresses)) {
          rows.push({ recipient, quantity });
        }
      });

      res.json({ rows });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  },
);
