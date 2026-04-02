'use client'
import { fetchDocument, fetchProject } from '@/lib/actions/document.action'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import TextDocCardOptions from '../shared/textDocCardOptions'

const DocumentCard = ({imgUrl, title, description, docId, type, isNew, userId, accessEmails, isPublic}:any) => {
  const router=useRouter()

  const handleClick=async()=>{
    //increase views
    if(isNew){
      if(type==="text"){
        await fetchDocument(docId, userId)
      }else{
        await fetchProject(docId, userId)
      }
      router.push(`/${type==="text"?"text-editor/documents":"code-editor/codes"}/${docId}`)
    }
    router.push(`/${type==="text"?"text-editor/documents":"code-editor/codes"}/${docId}`)
  }
  return (
    <div className='cursor-pointer relative' >
        <figure className='flex flex-col border-[1px] border-white-3 hover:border-orange-1 rounded-lg relative' >
            <Image src={imgUrl} alt={title} width={174} height={174} className=' aspect-square h-fit w-full 2xl:size[200px] border-[1px] border-white-3 hover:border-orange-1' onClick={handleClick}/>
            <div className="flex flex-col border-[1px] border-white-3 hover:border-orange-1 w-full p-3">
                <h1 className='text-16 truncate font-bold text-white-2' onClick={handleClick}>{title}</h1>
                <div className="flex justify-between items-center relative">
                  <h2 className='text-12 truncate font-normal capitalize text-white-4 w-1/2'>{description}</h2>
                  <TextDocCardOptions doc_id={docId} titleProp={title} descriptionProp={description} accessEmailsProp={accessEmails} isPublicProp={isPublic} />
                </div>
            </div>
            </figure>
      
    </div>
  )
}

export default DocumentCard;
