"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const maxPage = Math.ceil(total / limit);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {from} - {to} of {total}
      </span>

      <ChevronLeft
        className="cursor-pointer"
        onClick={() => page > 1 && onChange(page - 1)}
      />

      <ChevronRight
        className="cursor-pointer"
        onClick={() => page < maxPage && onChange(page + 1)}
      />
    </div>
  );
}
