import { Document, Model, Schema, Types, model, models } from "mongoose";

export type DocumentType = "text" | "code";

interface ActiveUser {
  id: string;
  name?: string;
  imageUrl?: string;
  lastSeen: Date;
}

interface ChangeEntry {
  userId: Types.ObjectId;
  operation: string;
  patch: unknown;
  version: number;
  timestamp: Date;
}

export interface ICollabDocument extends Document {
  id: string;
  title: string;
  description: string;
  imgUrl: string;
  userId: Types.ObjectId;
  content: string;
  data: string;
  allowedUsers: Types.ObjectId[];
  activeUsers: ActiveUser[];
  isPublic: boolean;
  type: DocumentType;
  version: number;
  hasConflicts: boolean;
  lastMergedAt?: Date;
  mergeStrategy: string;
  changes: ChangeEntry[];
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ActiveUserSchema = new Schema<ActiveUser>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    lastSeen: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChangeEntrySchema = new Schema<ChangeEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    operation: { type: String, required: true, trim: true },
    patch: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true, min: 1 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentSchema = new Schema<ICollabDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 140,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    imgUrl: {
      type: String,
      default: "",
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
    },
    data: {
      type: String,
      default: "",
    },
    allowedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    activeUsers: {
      type: [ActiveUserSchema],
      default: [],
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "code"],
      default: "text",
      required: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    hasConflicts: {
      type: Boolean,
      default: false,
    },
    lastMergedAt: {
      type: Date,
      default: null,
    },
    mergeStrategy: {
      type: String,
      default: "last-write-wins",
      trim: true,
    },
    changes: {
      type: [ChangeEntrySchema],
      default: [],
    },
    lastModified: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

DocumentSchema.index({ id: 1 }, { unique: true });
DocumentSchema.index({ userId: 1, type: 1, lastModified: -1 });
DocumentSchema.index({ lastModified: -1 });

const DocumentModel = (models.Document as Model<ICollabDocument>) || model<ICollabDocument>("Document", DocumentSchema);

export default DocumentModel;
