import { Card } from "~/components/ui/card"
import { Skeleton } from "~/components/ui/skeleton"

export default function FriendSuggestionItemSkeleton() {
  return (
    <div className="h-full px-2">
      <div className="bg-card flex h-full flex-col items-center gap-2 rounded-lg border p-4 shadow-sm">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="text-center w-full">
          <Skeleton className="h-5 w-24 mx-auto mb-1" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>
        <div className="flex-grow" />
        <div className="w-full flex flex-col gap-2 mt-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}
