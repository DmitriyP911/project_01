import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAddress {
  _id: mongoose.Types.ObjectId;
  address: string;
}

export interface IUserAddresses extends Document {
  userId: mongoose.Types.ObjectId;
  addresses: IAddress[];
}

const addressSchema = new Schema<IAddress>({
  address: { type: String, required: true, trim: true },
});

const userAddressesSchema = new Schema<IUserAddresses>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

export const UserAddresses: Model<IUserAddresses> = mongoose.model<IUserAddresses>(
  'UserAddresses',
  userAddressesSchema
);
