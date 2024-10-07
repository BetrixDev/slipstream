import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import MotionNumber from "motion-number";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function humanFileSize(size: number) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +(size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][i];
}

type HumanFileSizeMotionProps = {
  size: number;
};

export function HumanFileSizeMotion({ size }: HumanFileSizeMotionProps) {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));

  return (
    <span className="m-1 flex items-center">
      <MotionNumber value={+(size / Math.pow(1024, i)).toFixed(2) * 1} />
      {["B", "kB", "MB", "GB", "TB"][i]}
    </span>
  );
}

export function formatSecondsToTimestamp(seconds: number) {
  if (seconds < 0) {
    throw new Error("Seconds cannot be negative");
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  } else {
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}

export function handleCopyLink(link: string, title: string) {
  navigator.clipboard.writeText(`${window.location.origin}/p/${link}`);
  toast.success("Link copied to clipboard", {
    description: title,
  });
}
