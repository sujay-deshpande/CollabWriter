import Link from 'next/link'
import Image from 'next/image'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchUser } from '@/lib/actions/user.action'

const Page = async ({ params }: { params: { id: string } }) => {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (params.id !== user.id) {
    redirect(`/profile/${user.id}`)
  }

  const userInfo = (await fetchUser(user.id)) as any

  if (!userInfo) {
    redirect('/onboarding')
  }

  const displayName = userInfo?.name || user?.fullName || 'User'
  const displayUsername = userInfo?.username || user?.username || 'user'
  const displayEmail = userInfo?.email || user?.primaryEmailAddress?.emailAddress || 'No email available'
  const displayBio = userInfo?.bio || 'No bio added yet.'
  const displayImage = userInfo?.image || user?.imageUrl

  return (
    <main className='flex min-h-full flex-col px-4 py-8 sm:px-14'>
      <section className='mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <p className='text-12 uppercase tracking-[0.3em] text-white-4'>Profile</p>
            <h1 className='mt-2 text-28 font-bold text-white-1'>Account Profile</h1>
            <p className='mt-2 text-14 text-white-4'>View your details or switch to editing when changes are needed.</p>
          </div>

          <Link href='/profile/edit' className='rounded-full bg-orange-1 px-4 py-2 text-14 font-semibold text-white transition-colors hover:bg-orange-1/90'>
            Edit Profile
          </Link>
        </div>

        <div className='flex gap-2'>
          <Link href={`/profile/${user.id}`} className='rounded-full bg-orange-1 px-4 py-2 text-14 font-semibold text-white'>
            Profile
          </Link>
          <Link href='/profile/edit' className='rounded-full border border-white-3 px-4 py-2 text-14 font-semibold text-white-4 transition-colors hover:border-orange-1 hover:text-white-1'>
            Edit Profile
          </Link>
        </div>

        <section className='rounded-2xl border border-white-3 bg-black-2 p-6 shadow-lg'>
          <div className='flex flex-col gap-6 sm:flex-row sm:items-start'>
            <div className='flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white-3 bg-[#ffffff08]'>
              {displayImage ? (
                <Image src={displayImage} alt='profile image' width={96} height={96} className='h-full w-full object-cover' />
              ) : (
                <span className='text-24 font-bold text-white-2'>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex flex-col gap-1'>
                <h2 className='text-24 font-bold text-white-1'>{displayName}</h2>
                <p className='text-14 text-white-4'>@{displayUsername}</p>
              </div>

              <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                <div className='rounded-xl border border-white-3 bg-[#ffffff05] p-4'>
                  <p className='text-12 uppercase tracking-[0.2em] text-white-4'>Email</p>
                  <p className='mt-2 break-words text-14 text-white-1'>{displayEmail}</p>
                </div>
                <div className='rounded-xl border border-white-3 bg-[#ffffff05] p-4'>
                  <p className='text-12 uppercase tracking-[0.2em] text-white-4'>Username</p>
                  <p className='mt-2 break-words text-14 text-white-1'>@{displayUsername}</p>
                </div>
              </div>

              <div className='mt-4 rounded-xl border border-white-3 bg-[#ffffff05] p-4'>
                <p className='text-12 uppercase tracking-[0.2em] text-white-4'>Bio</p>
                <p className='mt-2 text-14 leading-6 text-white-1'>{displayBio}</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default Page
