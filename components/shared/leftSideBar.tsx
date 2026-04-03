'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { sidebarLinks } from '@/constants'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SignedOut, SignedIn, SignOutButton, useUser } from '@clerk/nextjs'
import { Button } from '../ui/button'

const LeftSideBar = () => {
  const pathname = usePathname()
  const { user } = useUser()

  const displayName = user?.fullName || user?.firstName || 'User'
  const displayUsername =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'user'

  return (
    <section className="left_sidebar flex h-screen flex-col justify-between px-4 py-6">
      
      <div>
        <Link
          href="/"
          className="flex items-center gap-2 pb-8 max-lg:justify-center"
        >
          <Image src="/icons/logo.png" alt="Podcast Logo" width={30} height={30}/>
          <h1 className='text-17 font-extrabold text-white-1 max-lg:hidden'> <span className='text-24'>C</span>ollabWriter</h1>
        
        </Link>

        <nav className="flex flex-col gap-2">
          {sidebarLinks.map(({ route, label, imgURL }) => {
            const finalRoute =
              route === '/profile' ? `/profile/${user?.id}` : route

            const isActive =
              pathname === finalRoute || pathname?.startsWith(finalRoute)

            return (
              <Link
                href={finalRoute}
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition-all',
                  'hover:bg-[#ffffff10]',
                  {
                    'bg-nav-focus border-r-4 border-orange-1 text-white':
                      isActive,
                  }
                )}
              >
                <Image src={imgURL} alt={label} width={22} height={22} />
                <p className="text-sm font-medium max-lg:hidden">{label}</p>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION */}
      <div className="flex flex-col gap-4">
        
        <SignedIn>
          {user && (
            <Link href={`/profile/${user.id}`}>
              <div className="rounded-lg bg-[#ffffff08] px-4 py-3">
                <h4 className="truncate text-sm font-bold text-white">
                  {displayName}
                </h4>
                <p className="truncate text-xs text-gray-400">
                  @{displayUsername}
                </p>
              </div>
            </Link>
          )}

          <Button className="w-full bg-orange-1 font-bold">
            <SignOutButton />
          </Button>
        </SignedIn>

        <SignedOut>
          <Button asChild className="w-full bg-orange-1 font-bold">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </SignedOut>

      </div>
    </section>
  )
}

export default LeftSideBar