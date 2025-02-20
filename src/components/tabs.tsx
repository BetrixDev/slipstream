"use client";

import { cn } from "../../app/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode;
};

export const Tabs = ({
  tabs: propTabs,
  className,
  activeTabClassName,
  tabClassName,
  setTab,
}: {
  tabs: Tab[];
  className?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  setTab: (val: string) => void;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);

  const moveSelectedTabToTop = (val: string) => {
    setTab(val);

    const activeTab = propTabs.find((tab) => tab.value === val);

    if (!activeTab) {
      return;
    }

    setActive(activeTab);
  };

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
        className
      )}
    >
      {propTabs.map((tab) => (
        <button
          type="button"
          key={tab.title}
          onClick={() => {
            moveSelectedTabToTop(tab.value);
          }}
          className={cn("relative px-4 py-2 rounded-md", tabClassName)}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {active.value === tab.value && (
            <motion.div
              layoutId="clickedbutton"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
              className={cn(
                "absolute inset-0 bg-secondary  rounded-md ",
                activeTabClassName
              )}
            />
          )}

          <span className="relative block text-primary">{tab.title}</span>
        </button>
      ))}
    </div>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
  hovering,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  const isActive = (tab: Tab) => {
    return tab.value === tabs[0].value;
  };
  return (
    <div className="relative w-full h-full">
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          style={{
            scale: 1 - idx * 0.1,
            top: hovering ? idx * -50 : 0,
            zIndex: -idx,
            opacity: idx < 3 ? 1 - idx * 0.1 : 0,
          }}
          animate={{
            y: isActive(tab) ? [0, 40, 0] : 0,
          }}
          className={cn("w-full h-full absolute top-0 left-0", className)}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
};
