import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function VideosBoardFallback() {
  return (
    <>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
      <Card className="dark relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border flex flex-col justify-between">
        <Skeleton className="h-full w-full" />
      </Card>
    </>
  );
}
