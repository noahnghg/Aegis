'use client'
import { motion } from 'framer-motion'

export function ThinkingIndicator() {
    return (
        <div className="flex items-center gap-1 p-4">
            <span className="text-sm text-muted-foreground mr-2">Thinking</span>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                    }}
                />
            ))}
        </div>
    )
}
