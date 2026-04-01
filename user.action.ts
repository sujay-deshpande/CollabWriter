"use server";

import { FilterQuery, UpdateQuery } from "mongoose";
import { connectToDatabase } from "./mongoose";
import UserModel, { IUser } from "./user.model";

type UpsertUserInput = {
  id: string;
  email: string;
  username: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  onboarded?: boolean;
};

export async function upsertUser(input: UpsertUserInput): Promise<IUser> {
  await connectToDatabase();

  const query: FilterQuery<IUser> = { id: input.id };
  const update: UpdateQuery<IUser> = {
    $set: {
      email: input.email,
      username: input.username,
      name: input.name,
      bio: input.bio ?? "",
      imageUrl: input.imageUrl ?? "",
      onboarded: input.onboarded ?? false,
    },
  };

  const user = await UserModel.findOneAndUpdate(query, update, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

  if (!user) {
    throw new Error("Failed to upsert user.");
  }

  return user;
}

export async function getUserByClerkId(clerkId: string): Promise<IUser | null> {
  await connectToDatabase();
  return UserModel.findOne({ id: clerkId });
}

export async function updateUserProfile(
  clerkId: string,
  updates: Partial<Pick<UpsertUserInput, "username" | "name" | "bio" | "imageUrl" | "onboarded">>
): Promise<IUser> {
  await connectToDatabase();

  const normalizedUpdates: UpdateQuery<IUser> = {
    $set: {
      ...(updates.username ? { username: updates.username } : {}),
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl } : {}),
      ...(updates.onboarded !== undefined ? { onboarded: updates.onboarded } : {}),
    },
  };

  const user = await UserModel.findOneAndUpdate({ id: clerkId }, normalizedUpdates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new Error("User not found while updating profile.");
  }

  return user;
}
