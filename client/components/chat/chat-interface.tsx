'use client'

import { useState } from 'react'
import { runAgent, sendFeedback } from '@/lib/api'
import { ChatInput } from './chat-input'
import { MessageBubble } from './message-bubble'
import { ThinkingIndicator } from './thinking-indicator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { v4 as uuidv4 } from 'uuid'
import { useSession } from 'next-auth/react'

export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    type?: 'text' | 'proposal'
    proposal?: any
    threadId?: string
    status?: 'paused' | 'completed'
}

export function ChatInterface() {
    const { data: session, status } = useSession()
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)

    console.log("DEBUG: Session Status:", status)
    console.log("DEBUG: Session Data:", session)

    const handleSend = async (text: string) => {
        const userMsg: Message = { id: uuidv4(), role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setIsLoading(true)

        try {
            const data = await runAgent(text, session?.accessToken)

            const aiMsg: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: data.message || data.response,
                type: data.status === 'paused' ? 'proposal' : 'text',
                proposal: data.roadmap,
                threadId: data.thread_id,
                status: data.status
            }

            setMessages(prev => [...prev, aiMsg])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: "Sorry, something went wrong." }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleProposalAction = async (threadId: string, action: 'COMMIT' | 'UPDATE', feedback?: string) => {
        setIsLoading(true)
        try {
            const data = await sendFeedback(threadId, action, feedback, session?.accessToken)

            // Update the previous message to reflect action taken (optional, or just add new message)
            // For now, we'll just add the new response

            const aiMsg: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: data.message,
                type: data.status === 'paused' ? 'proposal' : 'text',
                proposal: data.roadmap || data.scheduled_plan,
                threadId: threadId,
                status: data.status
            }

            setMessages(prev => [...prev, aiMsg])
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto">
            <ScrollArea className="flex-1 p-4">
                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onProposalAction={handleProposalAction}
                    />
                ))}
                {isLoading && <ThinkingIndicator />}
            </ScrollArea>
            <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
    )
}
