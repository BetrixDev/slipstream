"use client";

import { HumanFileSizeMotion } from "@/components/human-file-size-motion";
import { Button } from "@/components/ui/button";
import { humanFileSize } from "@/lib/utils";
import Link from "next/link";
import { useEffect } from "react";
import { useUserVideoDatastore } from "../stores/user-video-data";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: values won't change from server
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
