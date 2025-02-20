import { HumanFileSizeMotion } from "@/components/human-file-size-motion";
import { Button } from "@/components/ui/button";
import { humanFileSize } from "../../lib/utils";
import { Link } from "@tanstack/react-router";

type StorageUsedTextProps = {
  totalStorageUsed: number;
  maxStorage: number;
};

export function StorageUsedText({
  maxStorage: serverMaxStorage,
  totalStorageUsed,
}: StorageUsedTextProps) {
  return (
    <Link to="/pricing" preload="intent">
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
