import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EyeIcon, SquareArrowOutUpRightIcon, VideoIcon } from "lucide-react";
import { Separator } from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

export default function Loading() {
  return (
    <div className="max-w-screen h-screen flex flex-col">
      <header className="max-h-16 h-16 flex justify-between items-center px-4">
        <Link className="flex items-center" href="/" prefetch>
          <button className="flex-shrink-0 flex items-center z-10">
            <VideoIcon className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-2xl font-bold">Flowble</span>
          </button>
        </Link>
        <Link className="flex items-center" href="/" prefetch>
          <Button variant="outline" className="text-md flex gap-2 items-center rounded-lg h-10">
            <SquareArrowOutUpRightIcon className="w-5 h-5" />
            Go to Flowble
          </Button>
        </Link>
      </header>
      <div className="flex gap-4 p-4 max-w-full overflow-x-hidden h-full flex-col xl:flex-row">
        <Skeleton className="w-full aspect-video" />
        <div className="flex flex-col gap-4 min-w-96 w-96 grow">
          <Card className="border-none">
            <CardContent className="p-0 space-y-4">
              <h1 className="text-2xl font-bold">Loading...</h1>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-sm text-muted-foreground">
                <span>Uploaded on Loading...</span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  Loading views
                </span>
              </div>
            </CardContent>
          </Card>
          <Separator />
          <Card className="grow min-h-64 border-none"></Card>
        </div>
      </div>
    </div>
  );
}
