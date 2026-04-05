"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function TextReveal({
  text,
  className,
  delay = 0,
  highlightLast = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  highlightLast?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className={`inline-block ${highlightLast && i === words.length - 1 ? "gradient-text" : ""}`}
            initial={{ y: "100%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && "\u00A0"}
        </span>
      ))}
    </span>
  );
}
