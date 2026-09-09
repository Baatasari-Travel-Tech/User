"use client";

import type { FC } from "react";

type InlineSpinnerProps = {
  className?: string;
};

export const InlineSpinner: FC<InlineSpinnerProps> = ({ className }) => {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className ?? ""}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export default InlineSpinner;
