"use client"

import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import CustomerDialog, { CustomerFormType } from "./CustomerDialog"

export interface CustomerOption {
  id: string
  customerName: string
}

interface CustomerComboboxProps {
  customers: CustomerOption[]
  value: string
  onChange: (customerId: string) => void
  onSaveNewCustomer: (customer: CustomerFormType) => Promise<CustomerOption>
  onCustomerCreated?: (customer: CustomerOption) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  overviewMode?: boolean
  paddingYValue?: string
}

export function CustomerCombobox({
  customers,
  value,
  onChange,
  onSaveNewCustomer,
  onCustomerCreated,
  placeholder = "Select Customer",
  emptyMessage = "No customer found.",
  disabled = false,
  overviewMode = false,
  paddingYValue = "py-3"
}: CustomerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false)
  const [savingCustomer, setSavingCustomer] = React.useState(false)

  const selectedCustomer = customers.find((customer) => customer.id === value)
  const hasValue = Boolean(selectedCustomer)

  // Filter customers based on input
  const filteredCustomers = React.useMemo(() => {
    if (!inputValue) return customers
    return customers.filter((customer) => customer.customerName.toLowerCase().includes(inputValue.toLowerCase()))
  }, [customers, inputValue])

  // Sync input value with selected customer when not focused
  React.useEffect(() => {
    if (!open && selectedCustomer) {
      setInputValue(selectedCustomer.customerName)
    } else if (!open && !selectedCustomer) {
      setInputValue("")
    }
  }, [open, selectedCustomer])

  // Reset highlighted index when filtered results change
  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredCustomers])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSaveNewCustomer = async (form: CustomerFormType) => {
    setSavingCustomer(true)
    try {
      const newCustomer = await onSaveNewCustomer(form)
      onChange(newCustomer.id)
      setInputValue(newCustomer.customerName)
      onCustomerCreated?.(newCustomer)
      setCustomerDialogOpen(false)
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleOpenCustomerDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setCustomerDialogOpen(true)
  }
  const handleSelect = (customer: CustomerOption) => {
    onChange(customer.id)
    setInputValue(customer.customerName)
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!open) setOpen(true)
  }

  const handleInputFocus = () => {
    setOpen(true)
    // Select all text on focus for easy replacement
    inputRef.current?.select()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < filteredCustomers.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredCustomers[highlightedIndex]) {
          handleSelect(filteredCustomers[highlightedIndex])
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        if (selectedCustomer) {
          setInputValue(selectedCustomer.customerName)
        }
        break
      case "Tab":
        setOpen(false)
        break
    }
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (open && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [highlightedIndex, open])

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        {/* Input that acts as both trigger and search */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            disabled={disabled || overviewMode}
            placeholder={placeholder}
            className={`block w-full px-4 ${paddingYValue} pr-10 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] focus:outline-none transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setOpen(!open)
                if (!open) inputRef.current?.focus()
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Dropdown list */}
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-gray-600 shadow-lg"
          >
            {filteredCustomers.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
            ) : (

              <>
                {/* All Customers option */}
                <li
                  role="option"
                  aria-selected={value === ""}
                  onClick={() => { onChange(""); setInputValue(""); setOpen(false) }}
                  onMouseEnter={() => setHighlightedIndex(-1)}
                  className={`flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors text-white ${highlightedIndex === -1 ? "bg-blue-500" : ""}`}
                >
                  <Check className={`mr-2 h-4 w-4 text-white ${value === "" ? "opacity-100" : "opacity-0"}`} />
                  All Customers
                </li>
                {filteredCustomers.map((customer, index) => (

                  <li
                    key={customer.id}
                    role="option"
                    aria-selected={value === customer.id}
                    onClick={() => handleSelect(customer)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors text-white ${highlightedIndex === index ? "bg-blue-500" : ""} ${value === customer.id ? "font-medium" : ""}`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 text-white ${value === customer.id ? "opacity-100" : "opacity-0"}`}
                    />
                    {customer.customerName}
                  </li>

                ))}

              </>
            )}
            {/* Sticky "Add New Customer" button */}
            <li className="sticky bottom-0 border-t border-gray-500 bg-gray-700">
              <button
                type="button"
                onClick={handleOpenCustomerDialog}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#31BCFF] hover:bg-gray-600 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add New Customer
              </button>
            </li>
          </ul>
        )}

      </div>
      {customerDialogOpen && (
        <CustomerDialog
          open={true}
          onOpenChange={setCustomerDialogOpen}
          loading={savingCustomer}
          onSave={handleSaveNewCustomer}
        />
      )}
    </>
  )
}
