"use client";

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from "motion/react";

import { cn } from "@/lib/utils";

export type SheetSnap = "peek" | "half" | "full";

const PEEK_VISIBLE = 152; // px of sheet visible at "peek"
const FULL_TOP = 96; // px gap above the sheet at "full" (leaves the search bar visible)

function snapOffsets(viewportH: number): Record<SheetSnap, number> {
  const height = viewportH - FULL_TOP;
  return {
    full: 0,
    half: Math.max(0, height - viewportH * 0.5),
    peek: Math.max(0, height - PEEK_VISIBLE),
  };
}

/**
 * Draggable bottom sheet with three snap points (peek, half, full). Mobile only.
 * Drag from the handle; the content area scrolls independently.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  header,
  children,
  className,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const controls = useDragControls();
  const y = useMotionValue(10_000);
  const [viewportH, setViewportH] = useState(0);

  useEffect(() => {
    const update = () => setViewportH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!viewportH) return;
    const target = snapOffsets(viewportH)[snap];
    const anim = animate(
      y,
      target,
      reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40, mass: 0.9 },
    );
    return () => anim.stop();
  }, [snap, viewportH, reduceMotion, y]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offsets = snapOffsets(viewportH);
    // Project where the sheet would land given its velocity, then pick the nearest snap.
    const projected = y.get() + info.velocity.y * 0.18;
    const nearest = (Object.keys(offsets) as SheetSnap[]).reduce((best, key) =>
      Math.abs(offsets[key] - projected) < Math.abs(offsets[best] - projected) ? key : best,
    );
    if (nearest === snap) {
      animate(y, offsets[nearest], { type: "spring", stiffness: 420, damping: 40 });
    }
    onSnapChange(nearest);
  }

  const cycle: Record<SheetSnap, SheetSnap> = { peek: "half", half: "full", full: "peek" };
  const offsets = viewportH ? snapOffsets(viewportH) : null;

  return (
    <motion.section
      aria-label="Results"
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[24px] border-t bg-surface shadow-float lg:hidden",
        className,
      )}
      style={{ y, top: FULL_TOP, visibility: viewportH ? "visible" : "hidden" }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={offsets ? { top: offsets.full, bottom: offsets.peek } : undefined}
      dragElastic={0.08}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <div
        className="shrink-0 cursor-grab touch-none px-4 pt-2 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
      >
        <button
          type="button"
          onClick={() => onSnapChange(cycle[snap])}
          className="mx-auto flex h-6 w-16 items-center justify-center"
          aria-label={snap === "full" ? "Collapse results" : "Expand results"}
        >
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </button>
        {header}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          snap === "peek" ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </div>
    </motion.section>
  );
}
