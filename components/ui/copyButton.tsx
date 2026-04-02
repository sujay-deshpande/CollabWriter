'use client'
import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CopyTextButton = ({ textToCopy }:any) => {
  const notify = (notification: string) => toast(notification)
  const copyText = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      notify("User Id Copied, Paste this user Id to connect your Knots account")
    }).catch((err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <><ToastContainer /><button onClick={copyText}><span className="text-orange-1 cursor-pointer">Click To Copy</span></button></>
  );
};

export default CopyTextButton;
