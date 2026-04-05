"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 250 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 250 });

  useEffect(() => {
    // Hide on touch devices
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role='button'], input, textarea, select, [data-magnetic]")) {
        setIsHovering(true);
      }
    };

    const handleOut = () => setIsHovering(false);
    const handleLeave = () => setIsVisible(false);
    const handleEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    window.addEventListener("mouseout", handleOut);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mouseout", handleOut);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-foreground pointer-events-none z-[9999] mix-blend-difference"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
      />
      {/* Ring */}
      <motion.div
        className="fixed top-0 left-0 rounded-full border border-foreground/50 pointer-events-none z-[9999] mix-blend-difference"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: isHovering ? 56 : 32,
          height: isHovering ? 56 : 32,
          borderColor: isHovering ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      />
    </>
  );
}
