import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

const Page = async () => {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  redirect(`/profile/${user.id}`)
}

export default Page
