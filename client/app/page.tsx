import { ChatInterface } from '@/components/chat/chat-interface'
import { Sidebar } from '@/components/sidebar'
import { SessionProvider } from 'next-auth/react'
import { Providers } from './providers'

export default function Home() {
  return (
    <Providers>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <header className="p-4 border-b flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Aegis LifeOS
            </h1>
          </header>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </main>
      </div>
    </Providers>
  )
}
