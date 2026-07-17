import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names, resolving conflicts (last-wins) via tailwind-merge.
 * Standard shadcn/ui helper.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
