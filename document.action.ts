"use server";

import { Types } from "mongoose";
import { connectToDatabase } from "./mongoose";
import DocumentModel, { DocumentType, ICollabDocument } from "./document.model";

type CreateDocumentInput = {
  id: string;
  title: string;
  description?: string;
  imgUrl?: string;
  userId: string;
  type?: DocumentType;
  content?: string;
  data?: string;
  isPublic?: boolean;
};

export async function createDocument(input: CreateDocumentInput): Promise<ICollabDocument> {
  await connectToDatabase();

  const doc = await DocumentModel.create({
    id: input.id,
    title: input.title,
    description: input.description ?? "",
    imgUrl: input.imgUrl ?? "",
    userId: new Types.ObjectId(input.userId),
    type: input.type ?? "text",
    content: input.content ?? "",
    data: input.data ?? "",
    isPublic: input.isPublic ?? false,
    lastModified: new Date(),
  });

  return doc;
}

export async function getDocumentById(documentId: string): Promise<ICollabDocument | null> {
  await connectToDatabase();
  return DocumentModel.findOne({ id: documentId }).populate("userId", "id username name imageUrl");
}

export async function getDocumentsByUser(userId: string, type?: DocumentType): Promise<ICollabDocument[]> {
  await connectToDatabase();

  const query: { userId: Types.ObjectId; type?: DocumentType } = {
    userId: new Types.ObjectId(userId),
  };

  if (type) {
    query.type = type;
  }

  return DocumentModel.find(query).sort({ lastModified: -1 });
}

export async function updateDocumentContent(
  documentId: string,
  payload: { content?: string; data?: string; version?: number; hasConflicts?: boolean }
): Promise<ICollabDocument> {
  await connectToDatabase();

  const update = {
    ...(payload.content !== undefined ? { content: payload.content } : {}),
    ...(payload.data !== undefined ? { data: payload.data } : {}),
    ...(payload.version !== undefined ? { version: payload.version } : {}),
    ...(payload.hasConflicts !== undefined ? { hasConflicts: payload.hasConflicts } : {}),
    lastModified: new Date(),
  };

  const doc = await DocumentModel.findOneAndUpdate({ id: documentId }, { $set: update }, { new: true });

  if (!doc) {
    throw new Error("Document not found while updating content.");
  }

  return doc;
}
