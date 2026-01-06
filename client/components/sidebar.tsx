'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { History, Book, Settings, LogOut } from 'lucide-react'
import { signIn, signOut, useSession } from 'next-auth/react'

export function Sidebar() {
    const { data: session } = useSession()

    return (
        <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
            <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" /> LifeOS Memory
                </h2>
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">Recent Chats</h3>
                        <Button variant="ghost" className="w-full justify-start text-sm">
                            Study Plan: Biology
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-sm">
                            Schedule Meeting
                        </Button>
                    </div>

                    <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                            <Book className="w-3 h-3" /> Knowledge Vault
                        </h3>
                        <div className="text-sm text-muted-foreground pl-2">
                            <p>test_doc.pdf</p>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-2">
                {session ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {session.user?.image && (
                                <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
                            )}
                            <div className="text-sm truncate max-w-[100px]">
                                {session.user?.name}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => signOut()}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <Button className="w-full" onClick={() => signIn('google')}>
                        Sign In
                    </Button>
                )}
            </div>
        </div>
    )
}
