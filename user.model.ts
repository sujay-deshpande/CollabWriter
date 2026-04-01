import { Document, Model, Schema, Types, model, models } from "mongoose";

export interface IUser extends Document {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string;
  imageUrl: string;
  onboarded: boolean;
  document: Types.ObjectId[];
  projects: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."],
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      minlength: 3,
      maxlength: 32,
      match: [/^[a-z0-9_]+$/, "Username may only contain lowercase letters, numbers, and underscores."],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    onboarded: {
      type: Boolean,
      default: false,
      index: true,
    },
    document: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.index({ id: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 });
UserSchema.index({ createdAt: -1 });

const UserModel = (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

export default UserModel;
