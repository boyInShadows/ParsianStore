import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const USER_ROLES = ["customer", "support", "operator", "admin", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// P6.S1: a pricing-tier concept, deliberately separate from `role` (RBAC/
// staff permission level) -- a wholesale customer is still `role:
// "customer"`. No self-service application flow exists yet (owner's
// explicit choice) -- an admin flips this via scripts/setAccountType.ts.
export const ACCOUNT_TYPES = ["retail", "wholesale"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// §3.2 Address: embedded, not a top-level collection. `provinceId`/
// `cityId` reference the real Province/City collections (P2.S7) --
// P6.S2's own migration off plain province/city strings, so this reuses
// the existing /geo/provinces and /geo/cities?provinceId cascade
// endpoints directly rather than persisting disconnected display names.
// `_id` is declared here (unlike GarageEntry) because P6.S2's own
// /me/addresses routes need to address a specific entry via PATCH/DELETE
// /me/addresses/:id -- same reasoning CartItem's own `_id` comment gives.
export interface Address {
  _id?: Types.ObjectId;
  provinceId: Types.ObjectId;
  cityId: Types.ObjectId;
  line: string;
  postalCode: string;
  plate?: string;
  unit?: string;
  receiverName: string;
  receiverPhone: string;
}

// §3.4: "the Garage stores { makeId, modelId, genId, engineId?, year,
// nickname }". The Vehicle* models these reference don't exist until
// P2.S6 — a Mongoose `ref` is just a string name, so this is safe to
// write now and will resolve once those collections land.
export interface GarageEntry {
  makeId: Types.ObjectId;
  modelId: Types.ObjectId;
  genId: Types.ObjectId;
  engineId?: Types.ObjectId;
  year: number;
  nickname?: string;
}

export interface User extends WithTimestamps, WithSoftDelete {
  phone: string;
  name: string;
  email?: string;
  // Staff-only, optional (§3.3.5) — no login endpoint uses this yet since
  // §9's auth routes are phone-OTP only. Never selected by default so it
  // can't leak into an API response by accident.
  passwordHash?: string;
  role: UserRole;
  accountType: AccountType;
  addresses: Address[];
  garage: GarageEntry[];
  walletBalanceRial: number;
  isActive: boolean;
  lastLoginAt: Date | null;
}

type UserModelType = Model<User, object, SoftDeleteMethods>;

const addressSchema = new Schema<Address>(
  {
    provinceId: { type: Schema.Types.ObjectId, ref: "Province", required: true },
    cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    line: { type: String, required: true },
    postalCode: { type: String, required: true },
    plate: String,
    unit: String,
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },
  },
  { _id: true },
);

const garageEntrySchema = new Schema<GarageEntry>(
  {
    makeId: { type: Schema.Types.ObjectId, ref: "VehicleMake", required: true },
    modelId: { type: Schema.Types.ObjectId, ref: "VehicleModel", required: true },
    genId: { type: Schema.Types.ObjectId, ref: "VehicleGen", required: true },
    engineId: { type: Schema.Types.ObjectId, ref: "VehicleEngine" },
    year: { type: Number, required: true },
    nickname: String,
  },
  { _id: true },
);

const userSchema = new Schema<User, UserModelType, SoftDeleteMethods>({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: USER_ROLES, default: "customer", required: true },
  accountType: { type: String, enum: ACCOUNT_TYPES, default: "retail", required: true },
  addresses: { type: [addressSchema], default: [] },
  garage: { type: [garageEntrySchema], default: [] },
  walletBalanceRial: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
});

applyBasePlugins(userSchema);

export const UserModel = model<User, UserModelType>("User", userSchema);
