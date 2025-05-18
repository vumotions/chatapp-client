'use client'

import { Skeleton } from "~/components/ui/skeleton"

export function ConversationSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-2 mb-2 rounded-md">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}