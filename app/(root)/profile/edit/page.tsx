import AccountProfile from '@/components/forms/accountProfile'
import { fetchUser } from '@/lib/actions/user.action'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const Page = async () => {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const userInfo = (await fetchUser(user.id)) as any

  if (!userInfo) {
    redirect('/onboarding')
  }

  const userData = {
    id: user.id,
    objectId: String(userInfo._id || ''),
    name: userInfo.name || user.fullName || '',
    username: userInfo.username || '',
    email: userInfo.email || user.primaryEmailAddress?.emailAddress || '',
    bio: userInfo.bio || '',
    image: userInfo.image || user.imageUrl,
  }

  return (
    <main className='flex min-h-full flex-col px-4 py-8 sm:px-14'>
      <section className='mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <p className='text-12 uppercase tracking-[0.3em] text-white-4'>Profile</p>
            <h1 className='mt-2 text-28 font-bold text-white-1'>Edit Profile</h1>
            <p className='mt-2 text-14 text-white-4'>Update the details you want to keep current. Keep the form focused and simple.</p>
          </div>

          <Link href={`/profile/${user.id}`} className='rounded-full border border-white-3 px-4 py-2 text-14 font-semibold text-white-4 transition-colors hover:border-orange-1 hover:text-white-1'>
            View Profile
          </Link>
        </div>

        <div className='flex gap-2'>
          <Link href={`/profile/${user.id}`} className='rounded-full border border-white-3 px-4 py-2 text-14 font-semibold text-white-4 transition-colors hover:border-orange-1 hover:text-white-1'>
            Profile
          </Link>
          <Link href='/profile/edit' className='rounded-full bg-orange-1 px-4 py-2 text-14 font-semibold text-white'>
            Edit Profile
          </Link>
        </div>

        <section className='rounded-2xl border border-white-3 bg-black-2 p-6 shadow-lg'>
          <AccountProfile user={userData} btnTitle='Save Changes' />
          <div className='mt-8 flex justify-center'>
            <Link href={`/profile/${user.id}`} className='text-14 font-medium text-white-4 transition-colors hover:text-white-1'>
              Cancel and go back
            </Link>
          </div>
        </section>
      </section>
    </main>
  )
}

export default Page
