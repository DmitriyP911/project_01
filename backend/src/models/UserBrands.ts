import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand {
  brand: string;
  id: string;
}

export interface IUserBrands extends Document {
  userId: mongoose.Types.ObjectId;
  brands: IBrand[];
}

const brandSchema = new Schema<IBrand>(
  {
    brand: { type: String, required: true, trim: true },
    id: { type: String, required: true },
  },
  { _id: false },
);

const userBrandsSchema = new Schema<IUserBrands>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    brands: { type: [brandSchema], default: [] },
  },
  { timestamps: true },
);

export const UserBrands: Model<IUserBrands> = mongoose.model<IUserBrands>(
  'UserBrands',
  userBrandsSchema,
);
