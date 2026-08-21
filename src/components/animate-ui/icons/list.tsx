"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";

import {
  getVariants,
  useAnimateIconContext,
  IconWrapper,
  type IconProps,
} from "@/components/animate-ui/icons/icon";

type ListProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    line1: {
      initial: { x: 0 },
      animate: {
        x: [0, 2, 0],
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    },
    line2: {
      initial: { x: 0 },
      animate: {
        x: [0, -2, 0],
        transition: { duration: 0.4, ease: "easeInOut", delay: 0.06 },
      },
    },
    line3: {
      initial: { x: 0 },
      animate: {
        x: [0, 2, 0],
        transition: { duration: 0.4, ease: "easeInOut", delay: 0.12 },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ListProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.path
        d="M8 6h13"
        variants={variants.line1}
        initial="initial"
        animate={controls}
      />
      <motion.path d="M3 6h.01" />
      <motion.path
        d="M8 12h13"
        variants={variants.line2}
        initial="initial"
        animate={controls}
      />
      <motion.path d="M3 12h.01" />
      <motion.path
        d="M8 18h13"
        variants={variants.line3}
        initial="initial"
        animate={controls}
      />
      <motion.path d="M3 18h.01" />
    </motion.svg>
  );
}

function List(props: ListProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  List,
  List as ListIcon,
  type ListProps,
  type ListProps as ListIconProps,
};
