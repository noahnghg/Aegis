'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Mic, Send } from 'lucide-react'
import { uploadFile } from '@/lib/api'

interface ChatInputProps {
    onSend: (text: string) => void
    disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [input, setInput] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (input.trim()) {
                onSend(input)
                setInput('')
            }
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                await uploadFile(file)
                // Ideally show a toast or add a system message
                console.log('File uploaded')
            } catch (error) {
                console.error('Upload failed', error)
            }
        }
    }

    return (
        <div className="relative flex items-end gap-2 p-4 bg-background border-t">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
            />
            <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
            >
                <Paperclip className="w-5 h-5" />
            </Button>

            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[50px] max-h-[200px] resize-none"
                disabled={disabled}
            />

            <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={disabled}
            >
                <Mic className="w-5 h-5" />
            </Button>

            <Button
                size="icon"
                className="shrink-0"
                onClick={() => {
                    if (input.trim()) {
                        onSend(input)
                        setInput('')
                    }
                }}
                disabled={disabled || !input.trim()}
            >
                <Send className="w-5 h-5" />
            </Button>
        </div>
    )
}
