import { Router, Request, Response } from 'express';

import { protect, AuthRequest } from '../middleware/auth';
import { UserAddresses } from '../models/UserAddresses';

export const addressesRouter = Router();

// POST /api/addresses/my-addresses  (protected)
addressesRouter.post(
  '/my-addresses',
  protect,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { address } = req.body as { address?: string };

      if (!address) {
        res.status(400).json({ message: 'address is required' });
        return;
      }

      const userId = (req as AuthRequest).user._id;

      const doc = await UserAddresses.findOneAndUpdate(
        { userId },
        { $push: { addresses: { address } } },
        { upsert: true, new: true }
      );

      res.status(201).json({ addresses: doc.addresses });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }
);

// GET /api/addresses/get-addresses  (protected)
addressesRouter.get(
  '/get-addresses',
  protect,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user._id;
      const doc = await UserAddresses.findOne({ userId });
      res.json({ addresses: doc?.addresses ?? [] });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }
);
