"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { humanFileSize } from "@/lib/utils";
import { HumanFileSizeMotion } from "@/components/human-file-size-motion";
import { useUserVideoDatastore } from "../../stores/user-video-data";
import { useEffect } from "react";

type StorageUsedTextProps = {
  totalStorageUsed: number;
  maxStorage: number;
  maxFileUpload?: number;
};

export function StorageUsedText({
  maxStorage: serverMaxStorage,
  totalStorageUsed: serverTotalStorageUsed,
  maxFileUpload: serverMaxFileUpload,
}: StorageUsedTextProps) {
  const { totalStorageUsed } = useUserVideoDatastore();

  useEffect(() => {
    useUserVideoDatastore.setState({
      totalStorageAvailable: serverMaxStorage,
      maxFileUploadSize: serverMaxFileUpload,
      totalStorageUsed: serverTotalStorageUsed,
    });
  }, []);

  return (
    <Link href="/pricing">
      <Button variant="ghost" className="h-12 text-md">
        Storage used:
        <span className="mx-1">
          <HumanFileSizeMotion size={totalStorageUsed} />
        </span>{" "}
        / {humanFileSize(serverMaxStorage)}
      </Button>
    </Link>
  );
}
