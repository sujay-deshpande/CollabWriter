import mongoose from "mongoose";

const changeSchema = new mongoose.Schema({
    id: String,
    operation: String, // 'insert', 'delete', 'update'
    position: Number,
    content: String,
    userId: String,
    userName: String,
    timestamp: { type: Date, default: Date.now },
    version: Number,
});

const revisionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  version: { type: Number, default: 0 },
  authorId: { type: String, default: '' },
  authorName: { type: String, default: 'Guest' },
  label: { type: String, default: '' }, // humanized title shown in UI
  summary: { type: String, default: '' }, // short "AI-like" smart summary (heuristic)
  kind: { type: String, default: 'edit' }, // 'edit' | 'layout'
  createdAt: { type: Date, default: Date.now },
  snapshotHash: { type: String, default: '' },
  snapshot: { type: String, default: '' }, // Quill content snapshot (string)
});

const documentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    data: { type: String, default: "" },
    imgUrl: String,
    title: { type: String, default: "Untitled" },
    description: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    allowedUsers: [
        {
            type: String,
        },
    ],
    activeUsers: [
        {
            userId: String,
            userName: String,
            email: String,
            color: String,
            cursorPosition: Number,
            lastActive: { type: Date, default: Date.now },
        },
    ],
    isPublic: {
        type: Boolean,
        default: false,
    },
    type: { type: String, enum: ["text", "code"], default: "text" },
    version: { type: Number, default: 0 },
    lastModified: { type: Date, default: Date.now },
    lastModifiedBy: String,
    contentHash: String, // For conflict detection
    changes: [changeSchema], // Change history for real-time sync
  revisions: [revisionSchema], // Snapshot-based revision history for the UI
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Index for efficient queries
documentSchema.index({ userId: 1 });
documentSchema.index({ id: 1 });
documentSchema.index({ "allowedUsers": 1 });
documentSchema.index({ lastModified: -1 });

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

export default Document;