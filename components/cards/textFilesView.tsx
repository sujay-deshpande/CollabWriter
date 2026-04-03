'use client'

import { fetchDocument } from '@/lib/actions/document.action'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import CardActionMenu from '@/components/shared/cardActionMenu'

type TextFileItem = {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  allowedUsers: string[]
  owner: {
    id: string
    name: string
    username: string
  }
  isOwner: boolean
}

type Filter = 'all' | 'shared' | 'owner'

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared' },
  { value: 'owner', label: 'Owner' },
]

const getItemRoute = (item: TextFileItem) => `/text-editor/documents/${item.id}`

const formatDate = (date: string) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TextFilesView = ({ items, userId }: { items: TextFileItem[]; userId: string }) => {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [isPending, startTransition] = useTransition()

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'shared':
        return items.filter((item) => !item.isOwner)
      case 'owner':
        return items.filter((item) => item.isOwner)
      default:
        return items
    }
  }, [activeFilter, items])

  const handleCreateNewDocument = () => {
    const docId = uuidv4()

    startTransition(async () => {
      await fetchDocument(docId, userId)
      router.push(`/text-editor/documents/${docId}`)
    })
  }

  return (
    <section className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          <h1 className='text-20 font-bold text-white-1'>Your Text Files</h1>
          <p className='text-12 text-white-4'>Browse your files, shared documents, and ownership status.</p>
        </div>

        <Button
          size='sm'
          className='h-10 rounded-full bg-orange-1 px-4 text-white hover:bg-orange-1/90'
          onClick={handleCreateNewDocument}
          disabled={isPending}
        >
          {isPending ? 'Creating...' : 'Add new Document'}
        </Button>
      </div>

      <div className='flex flex-wrap gap-2'>
        {filterOptions.map((filter) => (
          <Button
            key={filter.value}
            size='sm'
            variant={activeFilter === filter.value ? 'default' : 'outline'}
            className={cn(
              'h-8 rounded-full border-white-3 px-4',
              activeFilter === filter.value
                ? 'bg-orange-1 text-white hover:bg-orange-1/90'
                : 'bg-transparent text-white-4 hover:bg-black-2 hover:text-white-1'
            )}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className='rounded-xl border border-dashed border-white-3 bg-black-2 p-8 text-center text-white-4'>
          No files found.
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className='group rounded-xl border border-white-3 bg-black-2/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-orange-1 hover:bg-black-2 relative'
            >
              <Link href={getItemRoute(item)} className='block'>
                <div className='mb-4 flex items-center justify-between gap-2'>
                  <span className='rounded-md bg-[#ffffff10] px-2 py-1 text-12 text-white-2'>File</span>
                  <span
                    className={cn(
                      'rounded-md px-2 py-1 text-12',
                      item.isOwner ? 'bg-[#204a2f] text-[#9dd9b0]' : 'bg-[#3a2f1f] text-[#f6cf8f]'
                    )}
                  >
                    {item.isOwner ? 'Owner' : 'Shared'}
                  </span>
                </div>

                <h2 className='text-16 font-bold text-white-1 line-clamp-1 group-hover:text-orange-1'>
                  {item.title || 'Untitled'}
                </h2>
                <p className='mt-1 text-12 text-white-4 line-clamp-2'>
                  {item.description || 'No description provided'}
                </p>

                <div className='mt-4 border-t border-white-3 pt-3 text-12 text-white-4'>
                  <p>Created: {formatDate(item.createdAt)}</p>
                  <p>Updated: {formatDate(item.updatedAt)}</p>
                  <p className='truncate'>By: {item.owner.name || item.owner.username || 'Unknown'}</p>
                </div>
              </Link>
              
              {item.isOwner && (
                <div className='absolute bottom-4 right-4 z-10'>
                  <CardActionMenu
                    docId={item.id}
                    title={item.title}
                    description={item.description}
                    accessEmails={item.allowedUsers || []}
                    isPublic={item.isPublic || false}
                    isOwner={item.isOwner}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default TextFilesView
