'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProposalCard } from './proposal-card'

interface MessageBubbleProps {
    message: any
    onProposalAction: (threadId: string, action: 'COMMIT' | 'UPDATE', feedback?: string) => void
}

export function MessageBubble({ message, onProposalAction }: MessageBubbleProps) {
    const isUser = message.role === 'user'

    return (
        <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
            <Avatar className="w-8 h-8">
                <AvatarFallback>{isUser ? 'U' : 'AI'}</AvatarFallback>
            </Avatar>

            <div className={cn(
                "flex flex-col max-w-[80%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "px-4 py-2 rounded-lg text-sm",
                    isUser
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                )}>
                    {message.content}
                </div>

                {message.type === 'proposal' && message.proposal && (
                    <ProposalCard
                        roadmap={message.proposal}
                        threadId={message.threadId}
                        onAction={(action, feedback) => onProposalAction(message.threadId, action, feedback)}
                    />
                )}
            </div>
        </div>
    )
}
