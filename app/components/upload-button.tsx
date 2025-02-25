import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { ArrowUp } from "lucide-react";
import { isUploadDialogOpenAtom } from "../lib/atoms";
import { motion } from "framer-motion";
import { useState } from "react";

export function UploadButton() {
  const setIsUploadDialogOpen = useSetAtom(isUploadDialogOpenAtom);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Button
      onMouseDown={() => setIsUploadDialogOpen(true)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      variant="ghost"
      className="relative inline-flex h-12 overflow-hidden rounded-lg p-[1px] focus:outline-none focus:ring-2 hover:ring-red-400 hover:ring-1 focus:ring-offset-2"
    >
      <span className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#ffcbcb_0%,#b23939_50%,#ffcbcb_100%)]" />
      <span className="text-lg inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-background px-3 py-1 font-medium text-primary backdrop-blur-3xl">
        <motion.div
          animate={{ rotate: isHovering ? 90 : 0 }}
          transition={{
            duration: 0.1,
            ease: "easeInOut",
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
        >
          <ArrowUp />
        </motion.div>
        Upload a Video
      </span>
    </Button>
  );
}
