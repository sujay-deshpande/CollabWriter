'use server'

import { connectToDB } from "../mongoose"
import User from "../models/user.model"
import { revalidatePath } from "next/cache";

interface Params {
    id: string;
    email:string;
    username: string;
    name: string;
    bio: string;
    imageUrl: string;
    path: string;
}

export async function fetchUsers() {
  try {
    await connectToDB();
    return await User.find({})
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}

export async function updateUser({
    id,
    email,
    bio,
    name,
    path,
    username,
    imageUrl,
  }: Params): Promise<void> {
    try {
      await connectToDB();
  
      await User.findOneAndUpdate(
        {id},
        {
            id,
            username: username.toLowerCase(),
            name,
            email,
            bio,
            imageUrl,
            onboarded: true,
        },
        { upsert: true }
      );

      if (path === "/profile/edit") {
        revalidatePath(path);
        revalidatePath(`/profile/${id}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to create/update user: ${error.message}`);
    }
}

export async function fetchUser(userId: string) {
  try {
    await connectToDB();

    return await User.findOne({ id: userId }).lean()
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}