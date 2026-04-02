'use server'

import { connectToDB } from "../mongoose"
import User from "../models/user.model"
import Document from "../models/document.model";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { generateContentHash } from "../realtime/conflict-resolution";

export async function fetchDocumentsByUserId(userId: string, type: string) {
    try {
        await connectToDB();
        
        const objectId = new mongoose.Types.ObjectId(userId);
        const documents = await Document.find({ userId: objectId, type }).lean();
        
        return documents;
    } catch (error: any) {
        throw new Error(`Failed to fetch documents for user: ${error.message}`);
    }
}

export async function fetchLibraryDocuments(userId: string, userEmail: string) {
    try {
        await connectToDB();

        const objectId = new mongoose.Types.ObjectId(userId);
        const documents = await Document.find({
            $or: [
                { userId: objectId },
                { allowedUsers: userEmail },
                { isPublic: true },
            ],
        })
            .populate("userId", "name username email")
            .sort({ lastModified: -1 })
            .lean();

        return documents;
    } catch (error: any) {
        throw new Error(`Failed to fetch library documents: ${error.message}`);
    }
}

export async function fetchDocument(doc_id: string, userId: string = "") {
    try {
        await connectToDB();
        let doc = await Document.findOne({ id: doc_id })
        if (doc) return doc;

        const currentDate = new Date()
        doc = await Document.create({
            id: doc_id,
            data: "",
            userId,
            type: "text",
            imgUrl: "",
            title: `New Document ${currentDate.toISOString()}-${userId}`,
            description: "This is a new document",
            version: 0,
            contentHash: generateContentHash(""),
            changes: [],
            activeUsers: [],
            lastModified: currentDate,
        })
        await User.findByIdAndUpdate(userId, { $push: { document: doc._id } })
        return doc;
    } catch (error: any) {
        throw new Error(`Failed to fetch user: ${error.message}`);
    }
}

export async function fetchProject(project_id: string, userId: string = "") {
    try {
        await connectToDB();
        let project = await Document.findOne({ id: project_id })
        if (project) {
            return {
                id: project.id,
                title: project.title,
                desc: project.description,
                userId: project.userId,
                allowedUsers: project.allowedUsers || [],
                isPublic: Boolean(project.isPublic),
            };
        }

        const currentDate = new Date()
        project = await Document.create({
            id: project_id,
            data: "",
            userId,
            type: "code",
            imgUrl: "",
            title: `New Project ${currentDate.toISOString()}-${userId}`,
            description: "This is a new Project",
            version: 0,
            contentHash: generateContentHash(""),
            changes: [],
            activeUsers: [],
            lastModified: currentDate,
        })
        await User.findByIdAndUpdate(userId, { $push: { projects: project._id } })
        return {
            id: project.id,
            title: project.title,
            desc: project.description,
            userId: project.userId,
            allowedUsers: project.allowedUsers || [],
            isPublic: Boolean(project.isPublic),
        }
    } catch (error: any) {
        throw new Error(`Failed to fetch user: ${error.message}`);
    }
}

export async function updateDocumentPermission(doc_id: string, accessEmail: any, isPublic: boolean) {
    try {
        console.log(accessEmail)
        await connectToDB();
        const doc = await Document.findOneAndUpdate(
            { id: doc_id },
            { allowedUsers: accessEmail, isPublic },
            { new: true }
        );
        if (!doc) {
            throw new Error("Document not found");
        }
        revalidatePath(`/editor/text-editor/documents/${doc_id}`);
        revalidatePath(`/editor/code-editor/codes/${doc_id}`);
    } catch (error: any) {
        throw new Error(`Failed to update document: ${error.message}`);
    }
}

export async function updateDocumentTitleDescription(doc_id: string, title: string, description: string) {
    try {
        await connectToDB();
        const doc = await Document.findOneAndUpdate(
            { id: doc_id },
            { title, description, lastModified: new Date(), updatedAt: new Date() },
            { new: true }
        );
        if (doc) {
            revalidatePath(`/editor/text-editor/documents/${doc_id}`);
        }
    } catch (error: any) {
        throw new Error(`Failed to update document: ${error.message}`);
    }
}

export async function updateProjectTitleDescription(project_id: string, title: string, description: string) {
    try {
        await connectToDB();
        const project = await Document.findOneAndUpdate(
            { id: project_id },
            { title, description, lastModified: new Date(), updatedAt: new Date() },
            { new: true }
        );
        if (project) {
            revalidatePath(`/editor/code-editor/codes/${project_id}`);
        }
    } catch (error: any) {
        throw new Error(`Failed to update document: ${error.message}`);
    }
}

export async function deleteDocument(doc_id: string) {
    try {
        await connectToDB();
        await Document.findOneAndDelete({ id: doc_id });
        revalidatePath('/editor/text-editor');
    } catch (error: any) {
        throw new Error(`Failed to delete document: ${error.message}`);
    }
}

export async function deleteProject(project_id: string) {
    try {
        await connectToDB();
        await Document.findOneAndDelete({ id: project_id });
        revalidatePath('/editor/code-editor');
    } catch (error: any) {
        throw new Error(`Failed to delete project: ${error.message}`);
    }
}

/**
 * Fetch document with real-time sync capabilities
 */
export async function fetchDocumentWithSync(doc_id: string) {
    try {
        await connectToDB();
        const doc = await Document.findOne({ id: doc_id });
        if (!doc) {
            throw new Error("Document not found");
        }
        return {
            id: doc.id,
            content: doc.data,
            title: doc.title,
            description: doc.description,
            version: doc.version,
            type: doc.type,
            lastModified: doc.lastModified,
            contentHash: doc.contentHash,
            changes: doc.changes || [],
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch document: ${error.message}`);
    }
}

/**
 * Bulk save changes to document
 */
export async function bulkSaveChanges(doc_id: string, changes: any[], content: string, version: number) {
    try {
        await connectToDB();
        const doc = await Document.findOneAndUpdate(
            { id: doc_id },
            {
                data: content,
                changes: changes,
                version: version,
                contentHash: generateContentHash(content),
                lastModified: new Date(),
                updatedAt: new Date(),
            },
            { new: true }
        );
        return doc;
    } catch (error: any) {
        throw new Error(`Failed to save changes: ${error.message}`);
    }
}

/**
 * Get document changes since version
 */
export async function getDocumentChangesSince(doc_id: string, sinceVersion: number) {
    try {
        await connectToDB();
        const doc = await Document.findOne({ id: doc_id });
        if (!doc) {
            throw new Error("Document not found");
        }
        const changesSince = doc.changes.filter((change: any) => change.version > sinceVersion);
        return changesSince;
    } catch (error: any) {
        throw new Error(`Failed to fetch changes: ${error.message}`);
    }
}

/**
 * Save text editor content directly (fallback when websocket backend is unavailable)
 */
export async function saveDocumentContent(
    doc_id: string,
    content: string,
    revisionMeta?: {
        revisionKind?: 'edit' | 'layout';
        authorId?: string;
        authorName?: string;
        label?: string;
        summary?: string;
    }
) {
    try {
        await connectToDB();

        const nextContentHash = generateContentHash(content);
        const existing = await Document.findOne({ id: doc_id }).select({ data: 1, contentHash: 1, version: 1, revisions: 1 }).lean();

        // If content did not change, skip persistence+revision writes.
        if (existing && existing.contentHash === nextContentHash) {
            return { ok: true, id: String(existing.id ?? doc_id) };
        }

        const kind = revisionMeta?.revisionKind || 'edit';
        const shouldPushRevision = kind !== 'layout';
        const nextVersion = Number(existing?.version ?? 0) + (shouldPushRevision ? 1 : 0);

        const nextRevision = shouldPushRevision
            ? {
                  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  version: nextVersion,
                  authorId: String(revisionMeta?.authorId || ''),
                  authorName: String(revisionMeta?.authorName || 'Guest'),
                  label: String(revisionMeta?.label || 'Saved revision'),
                  summary: String(revisionMeta?.summary || ''),
                  kind,
                  createdAt: new Date(),
                  snapshotHash: nextContentHash,
                  snapshot: content,
              }
            : null;

        const update: any = {
            $set: {
                data: content,
                contentHash: nextContentHash,
                lastModified: new Date(),
                updatedAt: new Date(),
                version: nextVersion,
            },
        };

        if (nextRevision) {
            // Keep revision history bounded for performance.
            update.$push = { revisions: { $each: [nextRevision], $slice: 100 } };
        }

        const doc = await Document.findOneAndUpdate({ id: doc_id }, update, { new: true });

        return {
            ok: Boolean(doc),
            id: doc ? String(doc.id) : doc_id,
        };
    } catch (error: any) {
        throw new Error(`Failed to save document content: ${error.message}`);
    }
}

/**
 * Fetch snapshot-based revision history for a document
 */
export async function fetchDocumentRevisionHistory(doc_id: string) {
    try {
        await connectToDB();

        const doc = await Document.findOne({ id: doc_id })
            .select({ revisions: 1 })
            .lean();

        const revisions = Array.isArray(doc?.revisions) ? doc!.revisions : [];

        // Latest first
        revisions.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

        return { ok: true, revisions };
    } catch (error: any) {
        throw new Error(`Failed to fetch revision history: ${error.message}`);
    }
}

/**
 * Fetch latest document content as a plain serializable payload
 */
export async function fetchLatestDocumentContent(doc_id: string) {
    try {
        await connectToDB();

        const doc = await Document.findOne({ id: doc_id })
            .select({ id: 1, data: 1, updatedAt: 1 })
            .lean();

        if (!doc) {
            return { ok: false, id: doc_id, data: '', updatedAt: '' };
        }

        return {
            ok: true,
            id: String(doc.id),
            data: typeof doc.data === 'string' ? doc.data : JSON.stringify(doc.data ?? ''),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch latest document content: ${error.message}`);
    }
}

/**
 * Upsert cursor position for a user in a document
 */
export async function upsertDocumentCursor(
    doc_id: string,
    userId: string,
    userName: string,
    email: string,
    color: string,
    cursorPosition: number
) {
    try {
        await connectToDB();

        const existing = await Document.updateOne(
            { id: doc_id, 'activeUsers.userId': userId },
            {
                $set: {
                    'activeUsers.$.userName': userName,
                    'activeUsers.$.email': email,
                    'activeUsers.$.color': color,
                    'activeUsers.$.cursorPosition': cursorPosition,
                    'activeUsers.$.lastActive': new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        if (!existing.matchedCount) {
            await Document.updateOne(
                { id: doc_id },
                {
                    $push: {
                        activeUsers: {
                            userId,
                            userName,
                            email,
                            color,
                            cursorPosition,
                            lastActive: new Date(),
                        },
                    },
                    $set: {
                        updatedAt: new Date(),
                    },
                }
            );
        }

        return { ok: true };
    } catch (error: any) {
        throw new Error(`Failed to upsert document cursor: ${error.message}`);
    }
}

/**
 * Fetch active cursor presence for a document
 */
export async function fetchDocumentCursorPresence(doc_id: string) {
    try {
        await connectToDB();

        const doc = await Document.findOne({ id: doc_id })
            .select({ activeUsers: 1 })
            .lean();

        if (!doc || !Array.isArray(doc.activeUsers)) {
            return { ok: true, users: [] as any[] };
        }

        const now = Date.now();
        const users = doc.activeUsers
            .filter((u: any) => {
                const ts = u?.lastActive ? new Date(u.lastActive).getTime() : 0;
                return now - ts < 120000;
            })
            .map((u: any) => ({
                userId: String(u?.userId ?? ''),
                userName: String(u?.userName ?? 'Guest'),
                color: String(u?.color ?? '#2563eb'),
                cursorPosition: Number(u?.cursorPosition ?? 0),
            }));

        return { ok: true, users };
    } catch (error: any) {
        throw new Error(`Failed to fetch document cursor presence: ${error.message}`);
    }
}
