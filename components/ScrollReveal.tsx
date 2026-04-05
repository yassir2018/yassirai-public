"use client";
import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";

type Variant = "fadeUp" | "fadeLeft" | "fadeRight" | "scaleUp" | "blur";

const variants: Record<Variant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scaleUp: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
};

export function ScrollReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = 0.6,
  className,
  rtl,
}: {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  duration?: number;
  className?: string;
  rtl?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  // Swap left/right for RTL
  let v = variant;
  if (rtl) {
    if (v === "fadeLeft") v = "fadeRight";
    else if (v === "fadeRight") v = "fadeLeft";
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants[v]}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger wrapper for lists
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
