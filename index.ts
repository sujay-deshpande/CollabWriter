export { connectToDatabase } from "./mongoose";

export { default as UserModel } from "./user.model";
export type { IUser } from "./user.model";

export { default as DocumentModel } from "./document.model";
export type { ICollabDocument, DocumentType } from "./document.model";

export { getUserByClerkId, updateUserProfile, upsertUser } from "./user.action";
export { createDocument, getDocumentById, getDocumentsByUser, updateDocumentContent } from "./document.action";
