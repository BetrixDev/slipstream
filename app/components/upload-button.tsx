import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useDialogsStore } from "@/lib/stores/dialogs";

export function UploadButton() {
  const openUploadVideoDialog = useDialogsStore(
    (state) => state.openUploadVideoDialog
  );

  const [isHovering, setIsHovering] = useState(false);

  return (
    <Button
      onMouseDown={() => openUploadVideoDialog()}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      variant="ghost"
      className="gap-2 md:order-2 relative inline-flex h-12 overflow-hidden rounded-lg p-[1px] focus:outline-none focus:ring-2 hover:ring-red-400 hover:ring-1 focus:ring-offset-2"
    >
      <span className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#ffcbcb_0%,#b23939_50%,#ffcbcb_100%)]" />
      <span className="text-lg inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-background px-3 py-1 font-medium text-primary backdrop-blur-3xl">
        <motion.div
          animate={{ rotate: isHovering ? 90 : 0 }}
          transition={{
            duration: 0.1,
            ease: "easeInOut",
            type: "spring",
            stiffness: 250,
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
