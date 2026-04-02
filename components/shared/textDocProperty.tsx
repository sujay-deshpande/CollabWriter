'use client'
import Image from 'next/image'
import React, {useState, useEffect} from 'react'
import { Input } from '../ui/input'
import { fetchDocument, updateDocumentPermission } from '@/lib/actions/document.action'
import { Label } from '../ui/label'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TextDocProperty = ({doc_id, accessEmailsProp, isPublicProp}:any) => {
  const [openHandleModal, setOpenHandleModal]=useState<boolean>(false)
  const [handleOpenOptionModal, setHandleOpenOptionModal]=useState<boolean>(false)
  const [isPublic, setIsPublic]=useState<boolean>(isPublicProp)
  const [input, setInput]=useState<string>("")
  const [accessEmails, setAccessEmails]=useState<string[]>(accessEmailsProp)
  const notify = (notification: string) => toast(notification)

  const handleInput=(e:any)=>{
    console.log(input)
    setInput(e.target.value)
  }

  const handleAddEmail=()=>{
    setAccessEmails([...accessEmails, input])
    setInput("")
  }

  const handleEmailDelete = (index: number) => {
    setAccessEmails(accessEmails.filter((_, i) => i !== index));
  };

  const handleChangePermission = async() => {
    
    if(isPublic){
      await updateDocumentPermission(doc_id, [""], isPublic)
      notify("You have made the file public succesfully !")
      window.location.reload()
    }else{
      await updateDocumentPermission(doc_id, accessEmails, isPublic)
      notify("The Permission related to the file has been changes successfully !")
      window.location.reload()
    }
  };
  

  return (
    <div className="">
      <ToastContainer />
      <div className=' z-10 hover:bg-white-3 cursor-pointer p-2 rounded-full' onClick={()=>setOpenHandleModal(!openHandleModal)}>
        <Image src={'/icons/three-dots.svg'} alt='three dots' width={22} height={22}/>
      </div>

      {openHandleModal&&(
        <div className="fixed top-16 right-20 z-10 flex flex-col justify-center items-center bg-dark-1 text-white-2 p-3 shadow-xl cursor-pointer hover:bg-dark-2" onClick={()=>setHandleOpenOptionModal(!handleOpenOptionModal)}>
          <div className="">Manage Access</div>
        </div>
      )}

      {handleOpenOptionModal&&(
        <div className="fixed top-1/3 right-[35%] z-10 flex flex-col justify-center items-center gap-2 bg-dark-1 text-white-2 p-3 shadow-xl cursor-pointer rounded-lg">
          <div className="">Add Emails To Whom You want to give access</div>
          <div className="relative w-full">
            <Input type='email' placeholder='example@example.com' value={input} onChange={(e)=>handleInput(e)} className='bg-black-3'/>
            <div className="absolute top-0 right-0 bg-white-1 p-2 text-black-1 rounded-r-lg px-4" onClick={()=>handleAddEmail()}>+</div>
          </div>
          {accessEmails.map((email:string, index:number)=>(
            <p key={index} className='text-white-2 mt-1 text-left grid grid-cols-2 items-center justify-between'>
              {email}
              <div className="flex w-full justify-end">
                <Image src={'/icons/delete.svg'} alt='three dots' width={14} height={14} onClick={()=>handleEmailDelete(index)}/>
              </div>
            </p>
          ))}
          
          <div className="flex w-full justify-between items-center my-5">
            <Label>Give Public Access</Label>
            <input type='checkbox' onChange={()=>setIsPublic(!isPublic)} checked={isPublic} className='p-3'/>
          </div>

          <div className="mt-10 bg-dark-3 p-3 cursor-pointer rounded-lg" onClick={()=>handleChangePermission()}>
            Confirm Access
          </div>
        </div>
      )}

    </div>

  )
}

export default TextDocProperty
