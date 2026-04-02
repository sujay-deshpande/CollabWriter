'use client'
import Image from 'next/image'
import React, {useState, useEffect,useRef} from 'react'
import { Input } from '../ui/input'
import { deleteDocument, updateDocumentPermission, updateDocumentTitleDescription } from '@/lib/actions/document.action'
import { Label } from '../ui/label'
import { ToastContainer, ToastContentProps, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TextDocCardOptions = ({doc_id, titleProp, descriptionProp, accessEmailsProp, isPublicProp}:any) => {
  const [openHandleModal, setOpenHandleModal]=useState<boolean>(false)
  const [handleOpenOptionModal, setHandleOpenOptionModal]=useState<boolean>(false)
  const [handleOpenRenameModal, setHandleOpenRenameModal]=useState<boolean>(false)
  const [isPublic, setIsPublic]=useState<boolean>(isPublicProp)
  const [input, setInput]=useState<string>("")
  const [title, setTitle]=useState<string>(titleProp)
  const [description, setDescription]=useState<string>(descriptionProp)
  const [accessEmails, setAccessEmails]=useState<string[]>(accessEmailsProp)
  const modalRef = useRef(null);
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
    }else{
      await updateDocumentPermission(doc_id, accessEmails, isPublic)
    }
    notify("Permission Managed")
    window.location.reload()
  };

  const handleRemoveDoc=async()=>{
    if(confirm("Are you sure you want to delete the document")){
        await deleteDocument(doc_id)
        notify("document Deleted") // Notification for the alerting
    }
    window.location.reload()
  }

  const handleTitleChange=async(e:any)=>{
    setTitle(e.target.value)
    await updateDocumentTitleDescription(doc_id, title, description)
  }

  const handleDescChange=async(e:any)=>{
    setDescription(e.target.value)
    await updateDocumentTitleDescription(doc_id, title, description)
  }


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setOpenHandleModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  

  return (
    <div className="relative">
      <ToastContainer />
      <div className=' hover:bg-white-3 cursor-pointer p-3 rounded-full' onClick={()=>setOpenHandleModal(!openHandleModal)}>
        <Image src={'/icons/three-dots.svg'} alt='three dots' width={17} height={17}/>
      </div>

      {openHandleModal&&(
        <div className="absolute top-[66%] right-[53%] z-10 flex flex-col justify-center items-center bg-dark-1 text-white-2 shadow-xl cursor-pointer w-[15rem] rounded-lg" ref={modalRef}>
          <div className="w-full rounded-lg hover:bg-dark-3 mb-1 p-2 flex gap-4" onClick={()=>setHandleOpenOptionModal(!handleOpenOptionModal)}> <Image src="/icons/discover.svg" width={17} height={17} alt='manage access'/> Manage Access</div>
          <div className="w-full rounded-lg hover:bg-dark-3 my-1 p-2 flex gap-4" onClick={handleRemoveDoc}> <Image src="/icons/delete.svg" width={17} height={17} alt='Remove'/> Remove</div>
          <div className="w-full rounded-lg hover:bg-dark-3 mt-1 p-2 flex gap-4" onClick={()=>setHandleOpenRenameModal(!handleOpenRenameModal)}> <Image src="/icons/edit.svg" width={17} height={17} alt='Rename'/> Rename</div>
        </div>
      )}

      {handleOpenOptionModal&&(
        <div className="absolute top-1/3 left-[60%] z-10 flex flex-col justify-center items-center gap-2 bg-dark-1 text-white-2 p-3 shadow-xl cursor-pointer rounded-lg w-[30rem]">
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


    {handleOpenRenameModal&&(
        <div className="absolute top-1/3 left-[60%] z-10 flex flex-col justify-center items-start gap-2 bg-dark-1 text-white-2 p-3 shadow-xl cursor-pointer rounded-lg w-[30rem]">
            <div className="w-full my-2">
                <p className='text-white-1'>Title</p>
                <Input type='text' className='bg-transparent px-3 w-full' value={title} onChange={(e)=>handleTitleChange(e)}/>
            </div>

            <div className="w-full my-2">
                <p className='text-white-1'>Description</p>
                <Input type='text' className='w-full bg-transparent px-3' value={description} onChange={(e)=>handleDescChange(e)}/>
            </div>

            <div className="w-full flex justify-end items-center">
                <div className="mt-5 bg-dark-3 p-3 cursor-pointer rounded-lg hover:bg-dark-2" onClick={()=>{
                    
                    notify("Title and Description Renamed")
                    window.location.reload()
                }}>
                    Save
                </div>
            </div>
        </div>
      )}

    </div>

  )
}

export default TextDocCardOptions
