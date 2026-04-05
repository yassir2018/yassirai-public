"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

export function MagneticButton({
  children,
  className,
  href,
  onClick,
  strength = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPosition({ x, y });
  };

  const handleLeave = () => setPosition({ x: 0, y: 0 });

  const Tag = href ? "a" : "button";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", damping: 15, stiffness: 200, mass: 0.1 }}
      data-magnetic
    >
      <Tag
        href={href || undefined}
        onClick={onClick}
        className={`group relative inline-flex items-center gap-2 overflow-hidden ${className || ""}`}
      >
        {/* Shimmer overlay */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        {children}
      </Tag>
    </motion.div>
  );
}
