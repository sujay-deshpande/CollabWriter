import React from 'react'

const TerminalTabs = ({setCurrentTerminal, index, isActive}:any) => {
  return (
    <div className='text-small-regular cursor-pointer' onClick={()=>setCurrentTerminal(index)} style={{fontSize:"13px", letterSpacing:"1px"}}>bash &nbsp;{index+1}</div>
  )
}

export default TerminalTabs;
