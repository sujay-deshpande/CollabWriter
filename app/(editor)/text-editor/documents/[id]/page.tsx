import TextEditor from '@/components/forms/textEditor'
import { currentUser } from '@clerk/nextjs/server';
import { fetchUser } from '@/lib/actions/user.action';
import { redirect } from 'next/navigation';
import React from 'react'
import { fetchDocument, fetchDocumentRevisionHistory } from '@/lib/actions/document.action';
import { formatDistanceToNow } from 'date-fns';

const Page = async({params}:{params:{id:string}}) => {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const userInfo = await fetchUser(user.id);
  if (!userInfo) {
    redirect('/onboarding');
  }

  const documentInfo = await fetchDocument(params.id, userInfo._id)
  const revisionHistory = await fetchDocumentRevisionHistory(params.id);

  const userData = {
    _id: String(userInfo._id),
    name: String(userInfo.name || user.firstName || user.username || user.email || "Guest"),
    email: String(userInfo.email),
    username: String(userInfo.username || user.username || ""),
  };

  const plainDocumentInfo = {
    id: String(documentInfo?.id ?? params.id),
    title: String(documentInfo?.title ?? "Untitled"),
    description: String(documentInfo?.description ?? ""),
    data:
      typeof documentInfo?.data === "string"
        ? documentInfo.data
        : JSON.stringify(documentInfo?.data ?? null),
    userId: String(documentInfo?.userId ?? ""),
    allowedUsers: Array.isArray(documentInfo?.allowedUsers)
      ? documentInfo.allowedUsers.map((email: any) => String(email))
      : [],
    isPublic: Boolean(documentInfo?.isPublic),
  };

  return (
    <div>
      <TextEditor
        id={params.id}
        userData={userData}
        documentData={plainDocumentInfo}
        revisionHistory={Array.isArray(revisionHistory?.revisions) ? revisionHistory.revisions : []}
      />
    </div>
  )
}

export default Page
