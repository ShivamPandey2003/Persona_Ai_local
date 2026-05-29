import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string): string {
  if (!name?.trim()) {
    return "NA";
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (parts[0].length === 1) {
    return `${parts[0]}X`.toUpperCase();
  }

  return "NA";
}