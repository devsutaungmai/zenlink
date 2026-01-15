"use client"

import { cn } from "@/shared/lib/utils"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Columns3Icon, RotateCcwIcon, CheckIcon, ChevronRightIcon } from "lucide-react"

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  /** If true, this column cannot be hidden */
  required?: boolean
}

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[]
  onColumnToggle: (key: string, visible: boolean) => void
  onResetColumns: () => void
}

export function ColumnVisibilityToggle({ columns, onColumnToggle, onResetColumns }: ColumnVisibilityToggleProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Toggle columns"
        >
          <Columns3Icon className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          )}
        >
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              className={cn(
                "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                "focus:bg-accent data-[state=open]:bg-accent",
              )}
            >
              <Columns3Icon className="mr-2 h-4 w-4" />
              Columns
              <ChevronRightIcon className="ml-auto h-4 w-4" />
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={2}
                alignOffset={-5}
                className={cn(
                  "z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out",
                  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                  "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                )}
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">Toggle columns</DropdownMenu.Label>
                <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-muted" />

                {columns.map((column) => (
                  <DropdownMenu.CheckboxItem
                    key={column.key}
                    checked={column.visible}
                    onCheckedChange={(checked) => onColumnToggle(column.key, checked)}
                    disabled={column.required}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                      "focus:bg-accent focus:text-accent-foreground",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <DropdownMenu.ItemIndicator>
                        <CheckIcon className="h-4 w-4" />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    {column.label}
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item
            onClick={onResetColumns}
            className={cn(
              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
              "focus:bg-accent focus:text-accent-foreground",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            )}
          >
            <RotateCcwIcon className="mr-2 h-4 w-4" />
            Reset Columns
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
