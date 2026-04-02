import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import TextDocProperty from './textDocProperty'
import { useEffect, useState } from 'react'
import { fetchUser } from '@/lib/actions/user.action'

const TopTextEditorNavbar = ({docName, docDesc, handleDescChange, handleTitleChange, id, allowedUsers, isPublic, userData, onOpenHistory}:any) => {
    const {user}=useUser()
    const [userInfo, setUserInfo]=useState<any>(userData)
  return (
    <header className='grid grid-cols-2 justify-between items-center bg-dark-1 py-2 px-8 sticky top-0 z-50'>
        <div className='flex cursor-pointer items-center gap-1 max-lg:justify-center'>
            <Link href="/"><Image src="/icons/logo.png" alt="Podcast Logo" width={30} height={30}/></Link>
            <div className="text-white-1 flex flex-col items-start justify-center w-full">
                <div className="flex gap-2 flex-grow-1">
                    <input type='text' className=' bg-transparent px-3' value={docName} onChange={(e)=>handleTitleChange(e)}/>
                    <Image src="/icons/heart.svg" width={16} height={16} alt='like'/>
                </div>
                <input type='text' className='w-full bg-transparent px-3 text-small-regular text-white-2' value={docDesc} onChange={(e)=>handleDescChange(e)}/>
            </div>
        </div>

        {user?(<div  className='w-full flex justify-end items-center'>
            <div className=" bg-[#ffffff08] px-6 rounded-lg py-1 flex items-center justify-center gap-3">
                <Link href={'/profile'}  className='flex gap-2'>
                    <Image
                        src={user?.imageUrl||userInfo.image}
                        alt="logo"
                        width={35}
                        height={35}
                        className='rounded-full'
                        />

                    <div className="flex-1 text-ellipsis">
                        <h4 className='text-small-semibold text-light-1 font-extrabold'>{userInfo?.name||user?.firstName}</h4>
                        <p className="text-small-medium text-gray-1">@{userInfo?.username || user?.username}</p>
                    </div>
                </Link>

                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="text-[12px] text-white-2 hover:text-white-1 transition-colors px-2 py-1 rounded bg-white/0 hover:bg-white/10"
                >
                  Revision History
                </button>

                <TextDocProperty doc_id={id} accessEmailsProp={allowedUsers} isPublicProp={isPublic}/>
            </div>
        </div>):""}

    </header>
  )
}

export default TopTextEditorNavbar
