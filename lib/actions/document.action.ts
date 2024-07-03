'use server'

import { connectToDB } from "../mongoose"
import User from "../models/user.model"
import Document from "../models/document.model";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function fetchDocumentsByUserId(userId: string, type:string) {
    try {
      await connectToDB();
      
      const objectId = new mongoose.Types.ObjectId(userId);
      const documents = await Document.find({ userId: objectId, type });
      
      return documents;
    } catch (error: any) {
      throw new Error(`Failed to fetch documents for user: ${error.message}`);
    }
  }

export async function fetchDocument(doc_id: string, userId:string) {
  try {
    connectToDB();
    let doc= await Document.findOne({id:doc_id})
    if(doc) return doc;

    doc= await Document.create({id:doc_id, data:"", userId, type:"text", imgUrl:"", title:"New Document", description:"This is a new document"})
    await User.findByIdAndUpdate(userId, {$push:{document:doc._id}})
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}
