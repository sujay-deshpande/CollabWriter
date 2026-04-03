import CodeFilesView from '@/components/cards/codeFilesView';
import { fetchLibraryDocuments } from '@/lib/actions/document.action';
import { fetchUser } from '@/lib/actions/user.action';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TopNavbar from '@/components/shared/topNavbar';


const Page = async () => {
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  const userInfo = (await fetchUser(user.id)) as { _id: string } | null;
  if (!userInfo) {
    redirect('/onboarding');
  }

  const userObjectId = String(userInfo._id);
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || '';
  const documents = (await fetchLibraryDocuments(userObjectId, primaryEmail)) as any[];
  const normalizedDocuments = (documents || [])
    .filter((document: any) => document.type === 'code')
    .map((document: any) => {
      const ownerValue = document.userId;
      const ownerId = typeof ownerValue === 'object' ? String(ownerValue?._id || '') : String(ownerValue || '');

      return {
        id: String(document.id ?? document._id),
        title: String(document.title ?? 'Untitled'),
        description: String(document.description ?? ''),
        createdAt: document.createdAt ? new Date(document.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: document.lastModified
          ? new Date(document.lastModified).toISOString()
          : document.updatedAt
            ? new Date(document.updatedAt).toISOString()
            : new Date().toISOString(),
        isPublic: Boolean(document.isPublic ?? false),
        allowedUsers: Array.isArray(document.allowedUsers) ? document.allowedUsers : [],
        owner: {
          id: ownerId,
          name: typeof ownerValue === 'object' ? String(ownerValue?.name || '') : '',
          username: typeof ownerValue === 'object' ? String(ownerValue?.username || '') : '',
        },
        isOwner: ownerId === userObjectId,
      };
    });

  return (
    <div className="">
      <TopNavbar />
      <div className='mt-9 flex flex-col gap-9 flex-1 px-4 sm:px-14'>
        <section className='flex flex-col gap-5 max-sm:px-4'>
          <CodeFilesView items={normalizedDocuments} userId={userObjectId} />
        </section>
      </div>
    </div>
  );
}

export default Page;
