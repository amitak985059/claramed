import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

let socket = null

const ChatWindow = ({ appointmentId, currentUserId, currentUserRole, currentUserName, onClose }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [typingUser, setTypingUser] = useState('')
    const [connected, setConnected] = useState(false)
    const bottomRef = useRef(null)
    const typingTimer = useRef(null)

    // ─── Init socket & load history ──────────────────────────────────────────
    useEffect(() => {
        if (!appointmentId) return

        // Load existing messages
        axios.get(`${BACKEND_URL}/api/chat/${appointmentId}`)
            .then(res => { if (res.data.success) setMessages(res.data.messages) })
            .catch(() => { })

        // Connect socket
        socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] })

        socket.on('connect', () => {
            setConnected(true)
            socket.emit('join_room', {
                appointmentId,
                userId: currentUserId,
                role: currentUserRole,
                name: currentUserName
            })
        })

        socket.on('receive_message', (msg) => {
            setMessages(prev => [...prev, msg])
        })

        socket.on('typing', ({ name }) => {
            setTypingUser(name)
            setIsTyping(true)
        })

        socket.on('stop_typing', () => {
            setIsTyping(false)
            setTypingUser('')
        })

        socket.on('disconnect', () => setConnected(false))

        return () => {
            socket?.disconnect()
            socket = null
        }
    }, [appointmentId])

    // Auto scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isTyping])

    // ─── Send message ────────────────────────────────────────────────────────
    const sendMessage = () => {
        if (!input.trim() || !socket) return
        socket.emit('send_message', {
            appointmentId,
            senderId: currentUserId,
            senderRole: currentUserRole,
            senderName: currentUserName,
            message: input.trim()
        })
        socket.emit('stop_typing', { appointmentId })
        setInput('')
    }

    // ─── Typing indicators ───────────────────────────────────────────────────
    const handleInput = (e) => {
        setInput(e.target.value)
        if (!socket) return
        socket.emit('typing', { appointmentId, name: currentUserName })
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => {
            socket.emit('stop_typing', { appointmentId })
        }, 1500)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    // ─── Format timestamp ────────────────────────────────────────────────────
    const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return (
        <div className='fixed bottom-6 right-6 z-50 w-[340px] sm:w-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden' style={{ maxHeight: '520px' }}>

            {/* Header */}
            <div className='bg-primary px-4 py-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <p className='text-white font-semibold text-sm'>Appointment Chat</p>
                </div>
                <button onClick={onClose} className='text-white/70 hover:text-white text-lg leading-none'>✕</button>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto px-3 py-3 space-y-2' style={{ minHeight: '280px', maxHeight: '340px' }}>
                {messages.length === 0 && (
                    <p className='text-center text-gray-400 text-xs mt-8'>No messages yet. Say hello!</p>
                )}
                {messages.map((msg, i) => {
                    const isMe = msg.senderId === currentUserId
                    return (
                        <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                                <p className='text-xs text-gray-400 mb-0.5 ml-1'>{msg.senderName}</p>
                            )}
                            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${isMe
                                ? 'bg-primary text-white rounded-tr-sm'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                                }`}>
                                {msg.message}
                            </div>
                            <p className='text-[10px] text-gray-400 mt-0.5 mx-1'>{formatTime(msg.createdAt)}</p>
                        </div>
                    )
                })}

                {/* Typing indicator */}
                {isTyping && (
                    <div className='flex items-start gap-1'>
                        <div className='bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-2xl rounded-tl-sm'>
                            <div className='flex gap-1 items-center h-4'>
                                <span className='w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce' style={{ animationDelay: '0ms' }} />
                                <span className='w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce' style={{ animationDelay: '150ms' }} />
                                <span className='w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce' style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                        <p className='text-xs text-gray-400 self-end mb-0.5'>{typingUser} is typing…</p>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className='border-t dark:border-gray-700 px-3 py-2 flex gap-2 items-end'>
                <textarea
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder='Type a message… (Enter to send)'
                    rows={1}
                    className='flex-1 resize-none text-sm border dark:border-gray-600 rounded-xl px-3 py-2 outline-primary dark:bg-gray-700 dark:text-gray-200 max-h-24 overflow-y-auto'
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className='bg-primary text-white rounded-xl px-3 py-2 text-sm disabled:opacity-40 hover:bg-primary/90 transition-all flex-shrink-0'
                >
                    Send
                </button>
            </div>
        </div>
    )
}

export default ChatWindow
