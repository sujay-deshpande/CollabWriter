'use client'

import Link from 'next/link'
import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LibraryItem = {
  id: string
  title: string
  description: string
  type: 'text' | 'code'
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

type Filter = 'all' | 'shared' | 'projects' | 'files' | 'owned'
type Layout = 'grid' | 'list'

const filterOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared' },
  { value: 'projects', label: 'Projects' },
  { value: 'files', label: 'Files' },
  { value: 'owned', label: 'Owned' },
]

const getItemRoute = (item: LibraryItem) => {
  return item.type === 'text'
    ? `/text-editor/documents/${item.id}`
    : `/code-editor/codes/${item.id}`
}

const formatDate = (date: string) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const LibraryItemsView = ({ items }: { items: LibraryItem[] }) => {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [layout, setLayout] = useState<Layout>('grid')

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'shared':
        return items.filter((item) => !item.isOwner)
      case 'projects':
        return items.filter((item) => item.type === 'code')
      case 'files':
        return items.filter((item) => item.type === 'text')
      case 'owned':
        return items.filter((item) => item.isOwner)
      default:
        return items
    }
  }, [activeFilter, items])

  return (
    <section className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-20 font-bold text-white-1'>All Files & Projects</h1>

        <div className='flex items-center gap-2 rounded-lg border border-white-3 p-1'>
          <Button
            size='sm'
            variant={layout === 'grid' ? 'default' : 'ghost'}
            className={cn('h-8 px-3', layout === 'grid' ? 'bg-orange-1 text-white hover:bg-orange-1/90' : 'text-white-4')}
            onClick={() => setLayout('grid')}
          >
            Grid
          </Button>
          <Button
            size='sm'
            variant={layout === 'list' ? 'default' : 'ghost'}
            className={cn('h-8 px-3', layout === 'list' ? 'bg-orange-1 text-white hover:bg-orange-1/90' : 'text-white-4')}
            onClick={() => setLayout('list')}
          >
            List
          </Button>
        </div>
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
        <div className='rounded-lg border border-dashed border-white-3 bg-black-2 p-8 text-center text-white-4'>
          No items found for this filter.
        </div>
      ) : layout === 'grid' ? (
        <div className='overflow-y-auto no-scrollbar max-h-[calc(100vh-260px)]'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={getItemRoute(item)}
                className='rounded-lg border border-white-3 bg-black-2 p-4 transition-colors hover:border-orange-1'
              >
                <div className='mb-3 flex items-center justify-between gap-2'>
                  <span className='rounded-md bg-[#ffffff10] px-2 py-1 text-12 capitalize text-white-2'>
                    {item.type === 'code' ? 'Project' : 'File'}
                  </span>
                  <span
                    className={cn(
                      'rounded-md px-2 py-1 text-12',
                      item.isOwner
                        ? 'bg-[#204a2f] text-[#9dd9b0]'
                        : 'bg-[#3a2f1f] text-[#f6cf8f]'
                    )}
                  >
                    {item.isOwner ? 'Owner' : 'Shared'}
                  </span>
                </div>

                <h2 className='text-16 font-bold text-white-1 line-clamp-1'>{item.title || 'Untitled'}</h2>
                <p className='mt-1 text-12 text-white-4 line-clamp-2'>{item.description || 'No description provided'}</p>

                <div className='mt-4 border-t border-white-3 pt-3 text-12 text-white-4'>
                  <p>Created: {formatDate(item.createdAt)}</p>
                  <p>Updated: {formatDate(item.updatedAt)}</p>
                  <p className='truncate'>By: {item.owner.name || item.owner.username || 'Unknown'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className='overflow-y-auto no-scrollbar max-h-[calc(100vh-260px)]'>
          <div className='flex flex-col gap-3'>
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={getItemRoute(item)}
                className='rounded-lg border border-white-3 bg-black-2 p-4 transition-colors hover:border-orange-1'
              >
                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div className='min-w-0'>
                    <h2 className='text-16 font-bold text-white-1 line-clamp-1'>{item.title || 'Untitled'}</h2>
                    <p className='mt-1 text-12 text-white-4 line-clamp-1'>{item.description || 'No description provided'}</p>
                  </div>

                  <div className='flex flex-wrap items-center gap-2 text-12'>
                    <span className='rounded-md bg-[#ffffff10] px-2 py-1 capitalize text-white-2'>
                      {item.type === 'code' ? 'Project' : 'File'}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-1',
                        item.isOwner
                          ? 'bg-[#204a2f] text-[#9dd9b0]'
                          : 'bg-[#3a2f1f] text-[#f6cf8f]'
                      )}
                    >
                      {item.isOwner ? 'Owner' : 'Shared'}
                    </span>
                    <span className='rounded-md bg-[#ffffff08] px-2 py-1 text-white-4'>Created {formatDate(item.createdAt)}</span>
                    <span className='rounded-md bg-[#ffffff08] px-2 py-1 text-white-4'>Updated {formatDate(item.updatedAt)}</span>
                    <span className='rounded-md bg-[#ffffff08] px-2 py-1 text-white-4'>By {item.owner.name || item.owner.username || 'Unknown'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default LibraryItemsView
