import Link from "next/link";
import { twMerge } from "tailwind-merge";
import type { ComponentProps } from "react";

type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  gold: "bg-gold-500 text-brand-950 hover:bg-gold-400 shadow-sm",
  outline: "border border-brand-700 text-brand-800 bg-white hover:bg-brand-50",
  ghost: "text-brand-800 hover:bg-brand-50",
  danger: "bg-red-700 text-white hover:bg-red-800 shadow-sm",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-5 text-base gap-2",
  lg: "min-h-12 px-6 text-lg gap-2",
};

/** Shared button styling; use for <button>, <Link> and <a>. `extra` classes override defaults (e.g. "hidden sm:inline-flex"). */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return twMerge(`inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]}`, extra);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };
export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };
export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
