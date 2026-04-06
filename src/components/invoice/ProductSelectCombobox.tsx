"use client"

import * as React from "react"
import { Check, ChevronDown, X, Plus } from "lucide-react"
import ProductDialog, { ProductFormType } from "./ProductDialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VatCode {
    name: string
    rate: number
}
interface BusinessVatCode {
    vatCode: VatCode
}

export interface ProductOption {
  id: string
  productName: string
  productNumber?: string | null
  salesPrice?: number
  discountPercentage?: number
      ledgerAccount?: {
        vatCode?: {
            code: number
            rate: number
        },
        businessVatCodes: BusinessVatCode[]
    }
}

interface ProductSelectComboboxProps {
  products: ProductOption[]
  value: string                                              // single selected product ID
  onChange: (productId: string) => void
  onProductCreated?: (product: ProductOption) => void        // called after new product saved
  onSaveNewProduct: (product: ProductFormType) => Promise<ProductOption>
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  overviewMode?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductSelectCombobox({
  products,
  value,
  onChange,
  onProductCreated,
  onSaveNewProduct,
  placeholder = "Select Product",
  emptyMessage = "No product found.",
  disabled = false,
  overviewMode = false,
}: ProductSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [productDialogOpen, setProductDialogOpen] = React.useState(false)
  const [savingProduct, setSavingProduct] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Deduplicate products in case parent passes duplicates
  const uniqueProducts = React.useMemo(
    () => [...new Map(products.map((p) => [p.id, p])).values()],
    [products]
  )

  const selectedProduct = React.useMemo(
    () => uniqueProducts.find((p) => p.id === value) ?? null,
    [uniqueProducts, value]
  )

  const filteredProducts = React.useMemo(() => {
    if (!inputValue) return uniqueProducts
    const q = inputValue.toLowerCase()
    return uniqueProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.productNumber?.toLowerCase().includes(q)
    )
  }, [uniqueProducts, inputValue])

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredProducts])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setInputValue("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectProduct = (product: ProductOption) => {
    onChange(product.id)
    setInputValue("")
    setOpen(false)
  }

  const clearProduct = (e: React.MouseEvent) => {
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
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredProducts[highlightedIndex]) {
          selectProduct(filteredProducts[highlightedIndex])
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

  const handleOpenProductDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setProductDialogOpen(true)
  }

  const handleSaveNewProduct = async (form: ProductFormType) => {
    setSavingProduct(true)
    try {
      const newProduct = await onSaveNewProduct(form)
      onChange(newProduct.id)
      onProductCreated?.(newProduct)
      setProductDialogOpen(false)
    } finally {
      setSavingProduct(false)
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        {/* Trigger */}
        <div
          className={`flex items-center w-full px-3 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm cursor-text transition-all duration-200
            ${open ? "ring-2 ring-[#31BCFF]/50 border-[#31BCFF]" : ""}
            ${disabled || overviewMode ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => {
            if (!disabled && !overviewMode) {
              setOpen(true)
              inputRef.current?.focus()
            }
          }}
        >
          {/* Selected product chip */}
          {selectedProduct && !inputValue && (
            <span className="inline-flex items-center gap-1 rounded-lg text-sm font-medium mr-2 shrink-0">
              {selectedProduct.productName}
              {!disabled && !overviewMode && (
                <button
                  type="button"
                  onClick={clearProduct}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
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
            disabled={disabled || overviewMode}
            placeholder={!selectedProduct ? placeholder : ""}
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
              if (!disabled && !overviewMode) {
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
            {filteredProducts.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
            ) : (
              filteredProducts.map((product, index) => {
                const isSelected = product.id === value
                return (
                  <li
                    key={product.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectProduct(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors text-white
                      ${highlightedIndex === index ? "bg-blue-500" : ""}
                      ${isSelected ? "font-medium" : ""}`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 text-white shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
                    />
                    <span>
                      {product.productName}
                    </span>
                  </li>
                )
              })
            )}

            {/* Sticky "Add New Product" button */}
            <li className="sticky bottom-0 border-t border-gray-500 bg-gray-700">
              <button
                type="button"
                onClick={handleOpenProductDialog}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#31BCFF] hover:bg-gray-600 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add New Product
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Product creation dialog — rendered outside the dropdown */}
      {productDialogOpen && (
        <ProductDialog
          open={true}
          onOpenChange={setProductDialogOpen}
          loading={savingProduct}
          onSave={handleSaveNewProduct}
        />
      )}
    </>
  )
}