import { humanFileSize } from "~/lib/utils";
import { useUploadingVideosStore } from "~/stores";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Progress } from "./ui/progress";
import MotionNumber from "motion-number";

export function UploadingVideosContainer() {
  const { uploadingVideos } = useUploadingVideosStore();

  return (
    <>
      {uploadingVideos.map((video) => (
        <Card className="relative bg-card rounded-lg overflow-hidden shadow-md transition-shadow duration-300 ease-in-out hover:shadow-lg group aspect-video border-border/50 hover:border-border">
          <Skeleton className="absolute inset-0">
            <div className="absolute inset-0 bg-black bg-opacity-60 transition-opacity duration-300 ease-in-out group-hover:bg-opacity-40"></div>
          </Skeleton>
          <div className="absolute right-0 bg-black/50 p-1 m-1 rounded-md backdrop-blur-md text-xs">
            {humanFileSize(video.videoSizeBytes)}
          </div>
          <div className="relative z-10 p-4 h-full flex flex-col justify-end">
            <h2 className="text-lg font-semibold line-clamp-2 text-white transition-colors duration-300 ease-in-out">
              {video.title}
            </h2>
            <span className="text-sm text-muted-foreground flex items-center">
              <MotionNumber
                value={video.uploadProgress}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                transition={{
                  y: { type: "spring", duration: 0.2, bounce: 0.25 },
                }}
              />
              %
            </span>
            <Progress value={video.uploadProgress} />
          </div>
        </Card>
      ))}
    </>
  );
}
