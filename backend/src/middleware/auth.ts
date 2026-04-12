import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUserDocument, User } from '../models/User';

interface JwtPayload {
  id: string;
}

export interface AuthRequest extends Request {
  user: IUserDocument;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    (req as AuthRequest).user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};
