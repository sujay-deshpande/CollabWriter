import React from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import TopNavbar from '@/components/shared/topNavbar'
import { fetchUser } from '@/lib/actions/user.action'
import { fetchLibraryDocuments } from '@/lib/actions/document.action'
import LibraryItemsView from '@/components/cards/libraryItemsView'

const Page = async ({ searchParams }: { searchParams?: { q?: string } }) => {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const userInfo = await fetchUser(user.id)
  if (!userInfo) {
    redirect('/onboarding')
  }

  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
  const documents = await fetchLibraryDocuments(String(userInfo._id), primaryEmail)
  const query = String(searchParams?.q || '').trim().toLowerCase()

  const allItems = (documents || []).map((document: any) => {
    const ownerValue = document.userId
    const ownerId = typeof ownerValue === 'object' ? String(ownerValue?._id || '') : String(ownerValue || '')

    return {
      id: String(document.id ?? document._id),
      title: String(document.title || 'Untitled'),
      description: String(document.description || ''),
      type: document.type === 'code' ? 'code' : 'text',
      createdAt: document.createdAt ? new Date(document.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: document.lastModified
        ? new Date(document.lastModified).toISOString()
        : document.updatedAt
          ? new Date(document.updatedAt).toISOString()
          : new Date().toISOString(),
      isPublic: Boolean(document.isPublic),
      allowedUsers: Array.isArray(document.allowedUsers)
        ? document.allowedUsers.map((email: string) => String(email))
        : [],
      owner: {
        id: ownerId,
        name: typeof ownerValue === 'object' ? String(ownerValue?.name || '') : '',
        username: typeof ownerValue === 'object' ? String(ownerValue?.username || '') : '',
      },
      isOwner: ownerId === String(userInfo._id),
    }
  })

  const items = !query
    ? allItems
    : allItems.filter((item: any) => {
        const haystack = [
          item.title,
          item.description,
          item.type,
          item.owner?.name,
          item.owner?.username,
          item.isOwner ? 'owner' : 'shared',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })

  return (
    <div>
      <TopNavbar onlySearch={true} searchAction='/' searchValue={searchParams?.q || ''} />
      <div className='mt-9 flex flex-col gap-9 px-4 sm:px-14'>
        <LibraryItemsView items={items} />
      </div>
    </div>
  )
}

export default Page
