"use client";

import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { UploadIcon } from "lucide-react";
import { isUploadDialogOpenAtom } from "../atoms";

export function UploadButton() {
  const setIsUploadDialogOpen = useSetAtom(isUploadDialogOpenAtom);

  return (
    <Button
      onMouseDown={() => setIsUploadDialogOpen(true)}
      variant="ghost"
      className="relative inline-flex h-12 overflow-hidden rounded-md p-[1px] focus:outline-none focus:ring-2 hover:ring-2 focus:ring-offset-2"
    >
      <span className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <span className="text-lg inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-background px-3 py-1 font-medium text-primary backdrop-blur-3xl">
        <UploadIcon /> Upload a Video
      </span>
    </Button>
  );
}
