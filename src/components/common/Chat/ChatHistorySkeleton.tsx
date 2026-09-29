import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHAT_COLUMN } from "./chatLayout";

function ChatHistorySkeleton() {
  return (
    <div className={cn(CHAT_COLUMN, "flex flex-col gap-10 px-2 py-2 md:px-10")}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-9 w-1/2 rounded-3xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </div>
  );
}

export default ChatHistorySkeleton;
