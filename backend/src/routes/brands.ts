import { Router, Request, Response } from 'express';

import { protect, AuthRequest } from '../middleware/auth';
import { UserBrands } from '../models/UserBrands';

export const brandsRouter = Router();

// POST /api/brands  (protected)
brandsRouter.post('/brands', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { brand, id } = req.body as { brand?: string; id?: string };

    if (!brand || !id) {
      res.status(400).json({ message: 'brand and id are required' });
      return;
    }

    const userId = (req as AuthRequest).user._id;

    const existing = await UserBrands.findOne({ userId, 'brands.brand': brand });
    if (existing) {
      res.status(409).json({ message: 'Такий бренд вже доданий' });
      return;
    }

    const doc = await UserBrands.findOneAndUpdate(
      { userId },
      { $push: { brands: { brand, id } } },
      { upsert: true, new: true },
    );

    res.status(201).json({ brands: doc.brands });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/brands  (protected)
brandsRouter.get('/brands', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user._id;
    const doc = await UserBrands.findOne({ userId });
    res.json({ brands: doc?.brands ?? [] });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// DELETE /api/brands/delete-brand  (protected)
brandsRouter.delete(
  '/brands/delete-brand',
  protect,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.body as { id?: string };

      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }

      const userId = (req as AuthRequest).user._id;

      const doc = await UserBrands.findOneAndUpdate(
        { userId },
        { $pull: { brands: { id } } },
        { new: true },
      );

      res.json({ brands: doc?.brands ?? [] });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  },
);
