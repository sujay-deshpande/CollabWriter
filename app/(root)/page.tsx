import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import TopNavbar from '@/components/shared/topNavbar'
import { fetchUser } from '@/lib/actions/user.action'
import { fetchLibraryDocuments } from '@/lib/actions/document.action'
import LibraryItemsView from '@/components/cards/libraryItemsView'

const Page = async ({ searchParams }: { searchParams?: { q?: string } }) => {
  const user = await currentUser()
  if (!user) {
    return (
      <main className='relative min-h-screen overflow-x-hidden bg-black-3 text-white-1'>
        <div className='pointer-events-none absolute inset-0'>
          <div className='hero-glow hero-glow-one' />
          <div className='hero-glow hero-glow-two' />
        </div>

        <header className='relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10'>
          <div className='flex items-center gap-3'>
            <Image src='/icons/logo.png' alt='CollabWriter logo' width={30} height={30} />
            <h1 className='text-17 font-extrabold text-white-1 max-lg:hidden'> <span className='text-24'>C</span>ollabWriter</h1>

          </div>

          <div className='flex items-center gap-3'>
            <Link href='/sign-in' className='rounded-full border border-white-3 px-4 py-2 text-14 font-semibold text-white-4 transition hover:border-orange-1 hover:text-white-1'>
              Log In
            </Link>
            <Link href='/sign-up' className='rounded-full bg-orange-1 px-5 py-2 text-14 font-semibold text-white transition hover:bg-orange-1/90'>
              Get Started
            </Link>
          </div>
        </header>

        <section className='relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 sm:px-10 lg:grid-cols-2 lg:items-center'>
          <div>
      
            <h2 className='text-[2.5rem] font-black leading-tight sm:text-[3.2rem]'>
              Build Together.
              <span className='block text-orange-1'>Write Together.</span>
            </h2>
            <p className='mt-4 max-w-xl text-16 text-white-4'>
              CollabWriter combines a coding playground and collaborative documents in one shared workspace with live cursors, chat, terminal, and instant file sync.
            </p>

            <div className='mt-8 flex flex-wrap gap-3'>
              <Link href='/sign-in' className='rounded-full bg-orange-1 px-6 py-3 text-14 font-bold text-white transition hover:bg-orange-1/90'>
                Log In To Continue
              </Link>
              <Link href='/sign-up' className='rounded-full border border-white-3 px-6 py-3 text-14 font-bold text-white-4 transition hover:border-orange-1 hover:text-white-1'>
                Create Account
              </Link>
            </div>
          </div>

          <div className='relative'>
            <div className='glass-panel relative overflow-hidden rounded-2xl border border-white-3 p-5 shadow-2xl'>
              <div className='mb-4 flex items-center justify-between'>
                <p className='text-12 uppercase tracking-[0.25em] text-white-4'>Live Collaboration</p>
                <span className='rounded-full bg-[#1f9d55] px-3 py-1 text-12 text-white'>Online</span>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='relative rounded-xl border border-white-3 bg-[#ffffff08] p-4'>
                  <p className='mb-2 text-12 text-white-4'>Coding Playground</p>
                  <div className='space-y-2 text-12 text-white-2'>
                    <p>{"const team = ['Sujay', 'Jay']"}</p>
                    <p>team.map(buildFeature)</p>
                    <p>deployTogether(team)</p>
                  </div>
                  <span className='cursor-tag cursor-tag-code'>Jay</span>
                </div>

                <div className='relative rounded-xl border border-white-3 bg-[#ffffff08] p-4'>
                  <p className='mb-2 text-12 text-white-4'>Document Editor</p>
                  <div className='space-y-2 text-12 text-white-2'>
                    <p>Project brief: Q2 launch</p>
                    <p>Goals, roadmap, review notes</p>
                    <p>Shared comments in realtime</p>
                  </div>
                  <span className='cursor-tag cursor-tag-doc'>Sujay</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='relative z-10 mx-auto mb-10 grid w-full max-w-6xl gap-4 px-6 sm:grid-cols-3 sm:px-10'>
          <div className='rounded-xl border border-white-3 bg-[#ffffff08] p-4'>
            <p className='text-14 font-bold'>Realtime Code Cursors</p>
            <p className='mt-1 text-12 text-white-4'>See exactly where teammates are typing in shared files.</p>
          </div>
          <div className='rounded-xl border border-white-3 bg-[#ffffff08] p-4'>
            <p className='text-14 font-bold'>Collaborative Documents</p>
            <p className='mt-1 text-12 text-white-4'>Write notes, specs, and edits together without switching apps.</p>
          </div>
          <div className='rounded-xl border border-white-3 bg-[#ffffff08] p-4'>
            <p className='text-14 font-bold'>One Shared Workspace</p>
            <p className='mt-1 text-12 text-white-4'>Code editor, document editor, terminal, and chat in one place.</p>
          </div>
        </section>

        <footer className='relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 text-center text-12 text-white-4 sm:px-10'>
          Developed by Sujay Deshpande. Copyright CollabWriter.
        </footer>

        <style>{`
          .hero-glow { position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.55; animation: floatGlow 8s ease-in-out infinite; }
          .hero-glow-one { width: 360px; height: 360px; background: #ff8f3f; top: 80px; left: -90px; }
          .hero-glow-two { width: 320px; height: 320px; background: #2f6dff; bottom: 40px; right: -80px; animation-delay: 1.2s; }
          .glass-panel { background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); backdrop-filter: blur(8px); }
          .cursor-tag { position: absolute; font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 999px; color: white; animation: pulseMove 2.2s ease-in-out infinite; }
          .cursor-tag-code { background: #ff6b4a; left: 52%; top: 54%; }
          .cursor-tag-doc { background: #3f8cff; left: 30%; top: 64%; animation-delay: .8s; }
          @keyframes floatGlow {
            0% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-18px) scale(1.04); }
            100% { transform: translateY(0px) scale(1); }
          }
          @keyframes pulseMove {
            0% { transform: translateX(0); }
            50% { transform: translateX(8px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      </main>
    )
  }

  const userInfo: any = await fetchUser(user.id)
  if (!userInfo) {
    redirect('/onboarding')
  }

  const userObjectId = String(userInfo._id)
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
  const documents = await fetchLibraryDocuments(userObjectId, primaryEmail)
  const query = String(searchParams?.q || '').trim().toLowerCase()

  const allItems = (documents || []).map((document: any) => {
    const ownerValue = document.userId
    const ownerId = typeof ownerValue === 'object' ? String(ownerValue?._id || '') : String(ownerValue || '')

    const docType: 'code' | 'text' = document.type === 'code' ? 'code' : 'text'

    return {
      id: String(document.id ?? document._id),
      title: String(document.title || 'Untitled'),
      description: String(document.description || ''),
      type: docType,
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
      isOwner: ownerId === userObjectId,
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
        <LibraryItemsView items={items as any} />
      </div>
    </div>
  )
}

export default Page
