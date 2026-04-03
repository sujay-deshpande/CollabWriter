'use client'
import Image from 'next/image'
import React, { useState, useEffect, useRef } from 'react'
import { Input } from '../ui/input'
import { deleteDocument, updateDocumentPermission, updateDocumentTitleDescription } from '@/lib/actions/document.action'
import { Label } from '../ui/label'
import { ToastContainer, toast } from 'react-toastify'

interface CardActionMenuProps {
  docId: string
  title: string
  description: string
  accessEmails: string[]
  isPublic: boolean
  isOwner: boolean
  onDeleteSuccess?: () => void
}

const CardActionMenu = ({
  docId,
  title,
  description,
  accessEmails: initialEmails,
  isPublic: initialIsPublic,
  isOwner,
  onDeleteSuccess,
}: CardActionMenuProps) => {
  const [openHandleModal, setOpenHandleModal] = useState<boolean>(false)
  const [handleOpenOptionModal, setHandleOpenOptionModal] = useState<boolean>(false)
  const [handleOpenRenameModal, setHandleOpenRenameModal] = useState<boolean>(false)
  const [isPublic, setIsPublic] = useState<boolean>(initialIsPublic)
  const [input, setInput] = useState<string>('')
  const [titleState, setTitleState] = useState<string>(title)
  const [descriptionState, setDescriptionState] = useState<string>(description)
  const [accessEmails, setAccessEmails] = useState<string[]>(initialEmails)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const notify = (notification: string) => toast(notification)

  const handleInput = (e: any) => {
    setInput(e.target.value)
  }

  const handleAddEmail = () => {
    if (input.trim() && !accessEmails.includes(input.trim())) {
      setAccessEmails([...accessEmails, input.trim()])
      setInput('')
    }
  }

  const handleEmailDelete = (index: number) => {
    setAccessEmails(accessEmails.filter((_, i) => i !== index))
  }

  const handleChangePermission = async () => {
    try {
      await updateDocumentPermission(docId, isPublic ? [''] : accessEmails, isPublic)
      notify('Permission Managed')
      setHandleOpenOptionModal(false)
      setOpenHandleModal(false)
      window.location.reload()
    } catch (error) {
      notify('Failed to update permissions')
    }
  }

  const handleRemoveDoc = async () => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        await deleteDocument(docId)
        notify('Document Deleted')
        setOpenHandleModal(false)
        if (onDeleteSuccess) {
          onDeleteSuccess()
        }
        window.location.reload()
      } catch (error) {
        notify('Failed to delete document')
      }
    }
  }

  const handleTitleDescChange = async () => {
    try {
      await updateDocumentTitleDescription(docId, titleState, descriptionState)
      notify('Title and Description Updated')
      setHandleOpenRenameModal(false)
      setOpenHandleModal(false)
      window.location.reload()
    } catch (error) {
      notify('Failed to update title and description')
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setOpenHandleModal(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!isOwner) {
    return null
  }

  return (
    <div className='relative'>
      <ToastContainer />
      <div
        className='hover:bg-white-3 cursor-pointer p-2 rounded-full transition-colors'
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpenHandleModal(!openHandleModal)
        }}
      >
        <Image src='/icons/three-dots.svg' alt='three dots' width={17} height={17} />
      </div>

      {openHandleModal && (
        <div
          className='absolute top-[120%] right-0 z-50 flex flex-col justify-center items-center bg-dark-1 text-white-2 shadow-xl cursor-pointer w-[15rem] rounded-lg border border-white-3'
          ref={modalRef}
        >
          <div
            className='w-full rounded-t-lg hover:bg-dark-3 p-3 flex gap-3 transition-colors'
            onClick={(e) => {
              e.stopPropagation()
              setHandleOpenOptionModal(!handleOpenOptionModal)
            }}
          >
            <Image src='/icons/discover.svg' width={17} height={17} alt='manage access' />
            <span>Manage Access</span>
          </div>
          <div className='w-full border-t border-white-3' />
          <div
            className='w-full hover:bg-dark-3 p-3 flex gap-3 transition-colors'
            onClick={(e) => {
              e.stopPropagation()
              setHandleOpenRenameModal(!handleOpenRenameModal)
            }}
          >
            <Image src='/icons/edit.svg' width={17} height={17} alt='Rename' />
            <span>Rename</span>
          </div>
          <div className='w-full border-t border-white-3' />
          <div
            className='w-full rounded-b-lg hover:bg-red-900/30 p-3 flex gap-3 transition-colors'
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveDoc()
            }}
          >
            <Image src='/icons/delete.svg' width={17} height={17} alt='Remove' />
            <span className='text-red-400'>Delete</span>
          </div>
        </div>
      )}

      {handleOpenOptionModal && (
        <div className='absolute top-1/3 right-[-350px] z-50 flex flex-col justify-center items-center gap-3 bg-dark-1 text-white-2 p-4 shadow-xl cursor-pointer rounded-lg w-[320px] border border-white-3'>
          <div className='text-white-1 font-semibold'>Add Emails To Whom You Want to Give Access</div>
          <div className='relative w-full'>
            <Input
              type='email'
              placeholder='example@example.com'
              value={input}
              onChange={(e) => handleInput(e)}
              className='bg-black-3'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddEmail()
                }
              }}
            />
            <div
              className='absolute top-0 right-0 bg-white-1 p-2 text-black-1 rounded-r-lg px-4 hover:bg-white-2 transition-colors cursor-pointer'
              onClick={(e) => {
                e.stopPropagation()
                handleAddEmail()
              }}
            >
              +
            </div>
          </div>

          {accessEmails.length > 0 && (
            <div className='w-full max-h-[150px] overflow-y-auto'>
              {accessEmails.map((email: string, index: number) => (
                <div key={index} className='text-white-2 mt-2 flex items-center justify-between gap-2 bg-black-3 p-2 rounded'>
                  <span className='text-sm truncate'>{email}</span>
                  <Image
                    src='/icons/delete.svg'
                    alt='remove'
                    width={14}
                    height={14}
                    className='cursor-pointer hover:opacity-70'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEmailDelete(index)
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className='flex w-full justify-between items-center my-3 gap-3'>
            <Label className='text-white-1'>Make Public</Label>
            <input
              type='checkbox'
              onChange={() => setIsPublic(!isPublic)}
              checked={isPublic}
              className='p-3 cursor-pointer'
            />
          </div>

          <div className='mt-4 flex w-full justify-end gap-2'>
            <button
              type='button'
              className='rounded-lg bg-dark-3 px-4 py-3 font-semibold text-white-1 transition-colors hover:bg-dark-2'
              onClick={(e) => {
                e.stopPropagation()
                setHandleOpenOptionModal(false)
              }}
            >
              Cancel
            </button>
            <button
              type='button'
              className='rounded-lg bg-orange-1 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-1/90'
              onClick={(e) => {
                e.stopPropagation()
                handleChangePermission()
              }}
            >
              Confirm Access
            </button>
          </div>
        </div>
      )}

      {handleOpenRenameModal && (
        <div className='absolute top-1/3 right-[-350px] z-50 flex flex-col justify-start gap-3 bg-dark-1 text-white-2 p-4 shadow-xl cursor-pointer rounded-lg w-[320px] border border-white-3'>
          <div className='w-full'>
            <p className='text-white-1 font-semibold mb-2'>Title</p>
            <Input
              type='text'
              className='bg-black-3 px-3 w-full'
              value={titleState}
              onChange={(e) => setTitleState(e.target.value)}
            />
          </div>

          <div className='w-full'>
            <p className='text-white-1 font-semibold mb-2'>Description</p>
            <Input
              type='text'
              className='w-full bg-black-3 px-3'
              value={descriptionState}
              onChange={(e) => setDescriptionState(e.target.value)}
            />
          </div>

          <div className='w-full flex justify-end items-center gap-2'>
            <button
              className='mt-4 bg-dark-3 p-2 px-4 cursor-pointer rounded-lg hover:bg-dark-2 transition-colors'
              onClick={(e) => {
                e.stopPropagation()
                setHandleOpenRenameModal(false)
              }}
            >
              Cancel
            </button>
            <button
              className='mt-4 bg-orange-1 p-2 px-4 cursor-pointer rounded-lg hover:bg-orange-1/90 transition-colors'
              onClick={(e) => {
                e.stopPropagation()
                handleTitleDescChange()
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CardActionMenu
