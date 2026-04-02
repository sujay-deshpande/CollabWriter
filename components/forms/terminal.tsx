'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

const themeMap:any={
    "light-1": "#FFFFFF",
    "light-2": "#EFEFEF",
    "light-3": "#7878A3",
    "light-4": "#5C5C7B",
    "gray-1": "#697C89",
    'white-1': "#FFFFFF",
    'white-2':"rgba(255, 255, 255, 0.72)",
    'white-3':"rgba(255, 255, 255, 0.4)",
    'white-4':"rgba(255, 255, 255, 0.64)",
    'white-5':"rgba(255, 255, 255, 0.80)",
    "dark-1": "#222831",
    "dark-2": "#2c3139",
    "dark-3": "#344955",
    "dark-4": "#1F1F22",
    "black-1": "#15171C",
    "black-2": "#222429",
    "black-3": "#101114",
    "black-4": "#252525",
    "black-5": "#2E3036",
    "black-6": "#24272C",
    "black-7": "rgb(24, 24, 24)",
}

const Terminal = ({ pId, isDarkMode, bgcolor, tId}: any) => {
    const [projectId, setProjectId] = useState<any>(pId)
    const [terminalId, setTerminalId] = useState<any>(tId)
    const terminalRef = useRef<HTMLDivElement | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const termRef = useRef<XTerminal | null>(null)
    const [showTerminal, setShowTerminal] = useState(true)

    useEffect(() => {
        console.log(bgcolor)
        setShowTerminal(false)
        setTimeout(() => {
            setShowTerminal(true)
        }, 200)
    }, [isDarkMode,bgcolor])


    useEffect(() => {
        if (showTerminal && terminalRef.current) {
            if (termRef.current) {
                termRef.current.dispose()
                termRef.current = null
            }

            const term = new XTerminal({
                theme: {
                    background: themeMap[bgcolor],
                    foreground: isDarkMode ? "#FFFFFF" : "#000000",
                    cursor: isDarkMode ? "#FFFFFF" : "#000000",
                    selectionBackground: isDarkMode ? "#FFFFFF3d" : "#0000003d",
                    selectionForeground: isDarkMode ? "#FFFFFF3d" : "#0000003d",
                },
                rows: 14,
                cols: 88,
                fontFamily: 'Courier New',
                fontSize: 14,
            })

            term.open(terminalRef.current)
            termRef.current = term

            if (term.element) {
                term.element.style.padding = "20px"
            }

            // Convert HTMLCollection to an array and iterate over each element
            Array.from(document.getElementsByClassName('xterm-viewport')).forEach((xterm) => {
                xterm.classList.add('no-scrollbar');
            });


            term.onData((data: any) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'terminal:write', data: data, projectId: projectId, terminalId:terminalId }))
                }
            })

            wsRef.current = new WebSocket(process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || 'ws://localhost:5001')

            wsRef.current.onopen = () => {
                console.log('WebSocket connection established')
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    if (pId) {
                        wsRef.current?.send(JSON.stringify({ type: "project:started", data: { id: pId, tId: tId } }));
                    }                
                }
                
            }

            wsRef.current.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'terminal:data' && message.projectId === projectId) {
                    term.write(message.data)
                }
            }

            wsRef.current.onclose = () => {
                console.log('WebSocket connection closed')
            }

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error)
            }
        }

        return () => {
            if (termRef.current) {
                termRef.current.dispose()
                termRef.current = null
            }
        }
    }, [projectId, isDarkMode, showTerminal,bgcolor, terminalId])

    useEffect(() => {
        setProjectId(pId)
    }, [pId])
    
    useEffect(() => {
        setTerminalId(tId)
    }, [tId])

    return (
        <>
            {showTerminal && <div id='terminal' ref={terminalRef}></div>}
        </>
    )
}

export default Terminal
