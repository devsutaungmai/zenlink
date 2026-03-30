"use client"

import * as React from "react"
import { Check, ChevronDown, X, Plus } from "lucide-react"
import LedgerAccountDialog, { LedgerAccountFormType } from "./LedgerAccountDialog"

export interface LedgerAccountOption {
  id: string
  accountNumber: string | number
  name: string
  vatCode?: { name: string; rate: number } | null
  businessVatCodes?: { vatCode: { name: string; rate: number } }[]
}

interface LedgerAccountSelectComboboxProps {
  ledgerAccounts: LedgerAccountOption[]
  value: string                          // selected ledger account ID
  onChange: (id: string) => void
  onLedgerAccountCreated?: (account: LedgerAccountOption) => void
  onSaveNewLedgerAccount: (account: LedgerAccountFormType) => Promise<LedgerAccountOption>
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Helper — build the display label (same format as CreateProductPage)
// ---------------------------------------------------------------------------
function ledgerLabel(account: LedgerAccountOption): string {
  const bv = account.businessVatCodes?.[0]?.vatCode
  const vatPart = bv
    ? `${bv.name} (${bv.rate}%)`
    : account.vatCode
    ? `${account.vatCode.name} (${account.vatCode.rate}%)`
    : "0%"
  return `${account.accountNumber} - ${account.name} - ${vatPart}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LedgerAccountSelectCombobox({
  ledgerAccounts,
  value,
  onChange,
  onLedgerAccountCreated,
  onSaveNewLedgerAccount,
  placeholder = "Select Ledger Account",
  emptyMessage = "No ledger account found.",
  disabled = false,
}: LedgerAccountSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [savingAccount, setSavingAccount] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Deduplicate
  const uniqueAccounts = React.useMemo(
    () => [...new Map(ledgerAccounts.map((a) => [a.id, a])).values()],
    [ledgerAccounts]
  )

  const selectedAccount = React.useMemo(
    () => uniqueAccounts.find((a) => a.id === value) ?? null,
    [uniqueAccounts, value]
  )

  const filteredAccounts = React.useMemo(() => {
    if (!inputValue) return uniqueAccounts
    const q = inputValue.toLowerCase()
    return uniqueAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        String(a.accountNumber).includes(q)
    )
  }, [uniqueAccounts, inputValue])

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredAccounts])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setInputValue("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectAccount = (account: LedgerAccountOption) => {
    onChange(account.id)
    setInputValue("")
    setOpen(false)
  }

  const clearAccount = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setInputValue("")
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!open) setOpen(true)
  }

  const handleInputFocus = () => setOpen(true)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredAccounts.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredAccounts[highlightedIndex]) {
          selectAccount(filteredAccounts[highlightedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        setInputValue("")
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement
      if (el) el.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, open])

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setDialogOpen(true)
  }

  const handleSaveNewAccount = async (form: LedgerAccountFormType) => {
    setSavingAccount(true)
    try {
      const newAccount = await onSaveNewLedgerAccount(form)
      onChange(newAccount.id)
      onLedgerAccountCreated?.(newAccount)
      setDialogOpen(false)
    } finally {
      setSavingAccount(false)
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        {/* Trigger */}
        <div
          className={`flex items-center w-full px-3 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm cursor-text transition-all duration-200
            ${open ? "ring-2 ring-[#31BCFF]/50 border-[#31BCFF]" : ""}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => {
            if (!disabled) {
              setOpen(true)
              inputRef.current?.focus()
            }
          }}
        >
          {/* Selected chip */}
          {selectedAccount && !inputValue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#31BCFF]/10 text-[#0EA5E9] text-sm font-medium border border-[#31BCFF]/20 mr-2 shrink-0 max-w-[80%] truncate">
              {ledgerLabel(selectedAccount)}
              {!disabled && (
                <button
                  type="button"
                  onClick={clearAccount}
                  className="ml-0.5 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          )}

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={!selectedAccount ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-sm"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />

          {/* Chevron */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) {
                setOpen(!open)
                if (!open) inputRef.current?.focus()
              }
            }}
            className="ml-auto text-gray-500 hover:text-gray-700 shrink-0"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-gray-600 shadow-lg"
          >
            {filteredAccounts.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
            ) : (
              filteredAccounts.map((account, index) => {
                const isSelected = account.id === value
                return (
                  <li
                    key={account.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectAccount(account)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors text-white
                      ${highlightedIndex === index ? "bg-blue-500" : ""}
                      ${isSelected ? "font-medium" : ""}`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 text-white shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="truncate">{ledgerLabel(account)}</span>
                  </li>
                )
              })
            )}

            {/* Sticky "Add New Ledger Account" button */}
            <li className="sticky bottom-0 border-t border-gray-500 bg-gray-700">
              <button
                type="button"
                onClick={handleOpenDialog}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#31BCFF] hover:bg-gray-600 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add New Ledger Account
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Dialog — rendered outside the dropdown */}
      {dialogOpen && (
        <LedgerAccountDialog
          open={true}
          onOpenChange={setDialogOpen}
          loading={savingAccount}
          onSave={handleSaveNewAccount}
        />
      )}
    </>
  )
}