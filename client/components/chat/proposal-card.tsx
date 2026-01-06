'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, Edit2 } from 'lucide-react'

interface ProposalCardProps {
    roadmap: any[]
    threadId: string
    onAction: (action: 'COMMIT' | 'UPDATE', feedback?: string) => void
}

export function ProposalCard({ roadmap, threadId, onAction }: ProposalCardProps) {
    return (
        <Card className="w-full max-w-md mt-2 border-indigo-500/50 bg-indigo-950/10">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-indigo-400">Proposed Study Plan</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <ul className="space-y-2">
                        {roadmap.map((item: any, index: number) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span>{item.topic}</span>
                                <span className="text-muted-foreground">{item.duration_hours}h</span>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                    const feedback = prompt("Enter feedback for modification:")
                    if (feedback) onAction('UPDATE', feedback)
                }}>
                    <Edit2 className="w-4 h-4 mr-1" /> Modify
                </Button>
                <Button size="sm" onClick={() => onAction('COMMIT')}>
                    <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
            </CardFooter>
        </Card>
    )
}
