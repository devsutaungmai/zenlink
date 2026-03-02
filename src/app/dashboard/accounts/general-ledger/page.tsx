"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import * as SelectPrimitive from "@radix-ui/react-select"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import {
  Filter,
  Search,
  Download,
  Settings,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Copy,
  ChevronDown,
  Check,
  FileSpreadsheet,
  FileText,
  FileDown,
  ChevronUp,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { on } from "events"
import { formatDateLocal, formatVoucherNumberForDisplay } from "@/shared/lib/invoiceHelper"
import { Description } from "@/components/invoice/Description"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useResizableColumns } from "@/hooks/use-resizable-columns"
import { ResizeHandle } from "@/components/invoice/resize-handle"

interface LedgerEntry {
  id: string
  closed: boolean
  voucherNo: string
  date: string
  description: string
  vatCode?: string
  currency?: string
  amount: number
  customerId?: string
  hasAttachment?: boolean
}

interface AccountGroup {
  id: string
  code: string
  name: string
  openingBalance: number
  closingBalance: number
  entries: LedgerEntry[]
}

interface LedgerReportResponse {
  accounts: AccountGroup[]
  period: {
    startDate: string
    endDate: string
  }
  totalBalance: number
}

export default function GeneralLedger({ businessId }: { businessId: string }) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"all" | "open">("all")
  const [accountData, setAccountData] = useState<AccountGroup[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date()

  const [dateRange, setDateRange] = useState({
    startDate: formatDateLocal(today),
    endDate: formatDateLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  })

  const [downloading, setDownloading] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  const RESIZABLE_COLUMNS = [
    { key: "closed", initialWidth: 80, minWidth: 60 },
    { key: "voucherNo", initialWidth: 120, minWidth: 80 },
    { key: "date", initialWidth: 100, minWidth: 80 },
    { key: "description", initialWidth: 220, minWidth: 120 },
    { key: "vatCode", initialWidth: 100, minWidth: 70 },
    { key: "currency", initialWidth: 100, minWidth: 70 },
    { key: "amount", initialWidth: 120, minWidth: 80 },
  ]
  const { getColumnWidth, onMouseDown, resetWidths } = useResizableColumns({
    storageKey: "general-ledger-col-widths",
    columns: RESIZABLE_COLUMNS,
  })

  // Fetch ledger data
  useEffect(() => {
    fetchLedgerData()
  }, [dateRange])

  const fetchLedgerData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        // Optional: add specific account numbers
        // accountNumbers: '1500,1900,3200'
      })

      const response = await fetch(`/api/ledger/report?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch ledger data')
      }

      const data: LedgerReportResponse = await response.json()
      setAccountData(data.accounts)
    } catch (error) {
      console.error('Error fetching ledger:', error)
      // Optionally show error toast
    } finally {
      setLoading(false)
    }
  }

  const toggleEntry = (id: string) => {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEntries(newSelected)
  }

  const toggleAccount = (accountId: string) => {
    const account = accountData.find((a) => a.id === accountId)
    if (!account) return

    const accountEntryIds = account.entries.map((e) => e.id)
    const allSelected = accountEntryIds.every((id) => selectedEntries.has(id))

    const newSelected = new Set(selectedEntries)
    if (allSelected) {
      accountEntryIds.forEach((id) => newSelected.delete(id))
    } else {
      accountEntryIds.forEach((id) => newSelected.add(id))
    }
    setSelectedEntries(newSelected)
  }

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  // const moveDateRange = (direction: 'prev' | 'next') => {
  //   const start = new Date(dateRange.startDate)
  //   const end = new Date(dateRange.endDate)
  //   const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  //   if (direction === 'prev') {
  //     start.setDate(start.getDate() - diffDays)
  //     end.setDate(end.getDate() - diffDays)
  //   } else {
  //     start.setDate(start.getDate() + diffDays)
  //     end.setDate(end.getDate() + diffDays)
  //   }

  //   setDateRange({
  //     startDate: formatDateLocal(start),
  //     endDate: formatDateLocal(end),
  //   })
  // }

  const totalEntries = accountData.reduce((sum, acc) => sum + acc.entries.length, 0)

  // Download function
  const handleDownload = async (format: 'excel' | 'pdf' | 'csv') => {
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: format
      })

      const response = await fetch(`/api/ledger/report/download?${params}`)

      if (!response.ok) {
        throw new Error('Failed to download')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `general-ledger.${format}`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium text-foreground sm:text-2xl">General ledger</h1>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          {/* Top Row - Filters and Search */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button variant="outline" className="gap-2 bg-transparent w-full sm:w-auto">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 text-sm sm:text-base">Filters</span>
            </Button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search" className="pl-9 text-sm" />
            </div>
          </div>

          {/* Second Row - Select, Tabs, and Date Range */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <SelectPrimitive.Root defaultValue="all">
              <SelectPrimitive.Trigger className="inline-flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted w-full sm:w-[180px]">
                <SelectPrimitive.Value />
                <SelectPrimitive.Icon>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectPrimitive.Icon>
              </SelectPrimitive.Trigger>
              <SelectPrimitive.Portal>
                <SelectPrimitive.Content className="overflow-hidden bg-background rounded-md border border-border shadow-lg">
                  <SelectPrimitive.Viewport className="p-1">
                    <SelectPrimitive.Item
                      value="all"
                      className="relative flex items-center gap-2 px-8 py-2 text-sm rounded-sm cursor-pointer hover:bg-muted focus:bg-muted outline-none"
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2">
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>All accounts</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    <SelectPrimitive.Item
                      value="assets"
                      className="relative flex items-center gap-2 px-8 py-2 text-sm rounded-sm cursor-pointer hover:bg-muted focus:bg-muted outline-none"
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2">
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>Assets</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    <SelectPrimitive.Item
                      value="liabilities"
                      className="relative flex items-center gap-2 px-8 py-2 text-sm rounded-sm cursor-pointer hover:bg-muted focus:bg-muted outline-none"
                    >
                      <SelectPrimitive.ItemIndicator className="absolute left-2">
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>Liabilities</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
              </SelectPrimitive.Portal>
            </SelectPrimitive.Root>

            <TabsPrimitive.Root value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "open")}>
              <TabsPrimitive.List className="inline-flex items-center rounded-lg border border-border bg-background w-full sm:w-auto">
                <TabsPrimitive.Trigger
                  value="all"
                  className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-medium transition-colors data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=inactive]:text-foreground hover:bg-muted rounded-l-lg"
                >
                  All entries
                </TabsPrimitive.Trigger>
                <TabsPrimitive.Trigger
                  value="open"
                  className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm font-medium transition-colors data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=inactive]:text-foreground hover:bg-muted rounded-r-lg"
                >
                  Open entries
                </TabsPrimitive.Trigger>
              </TabsPrimitive.List>
            </TabsPrimitive.Root>
          </div>

          {/* Third Row - Date Range and Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 sm:px-4 flex-1 sm:flex-none">
              <span className="text-xs sm:text-sm text-foreground truncate">
                {dateRange.startDate} - {dateRange.endDate}
              </span>
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDateRange("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDateRange("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div> */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />

            {/* Download and Settings - Icon Buttons */}
            <div className="flex items-center gap-2 justify-end">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="ghost" size="icon" disabled={downloading} className="h-8 w-8 sm:h-10 sm:w-10">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50"
                    sideOffset={5}
                  >
                    <DropdownMenu.Item
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none"
                      onSelect={() => handleDownload("excel")}
                    >
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none"
                      onSelect={() => handleDownload("pdf")}
                    >
                      <FileText className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded outline-none"
                      onSelect={() => handleDownload("csv")}
                    >
                      <FileDown className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground text-sm">Loading ledger data...</div>
          </div>
        ) : accountData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground text-sm">No ledger entries found for this period</div>
          </div>
        ) : (
          <>
            <div className="hidden md:block border border-border rounded-lg overflow-auto">
              <table className="w-full border-collapse">
                <colgroup>
                  <col style={{ width: getColumnWidth("closed") }} />
                  <col style={{ width: getColumnWidth("voucherNo") }} />
                  <col style={{ width: getColumnWidth("date") }} />
                  <col style={{ width: getColumnWidth("description") }} />
                  <col style={{ width: getColumnWidth("vatCode") }} />
                  <col style={{ width: getColumnWidth("currency") }} />
                  <col style={{ width: getColumnWidth("amount") }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 border-r border-border p-3 text-left">
                      <Checkbox />
                    </th>
                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Closed
                      <ResizeHandle onMouseDown={onMouseDown("closed")} />
                    </th>

                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Voucher no.
                      <ResizeHandle onMouseDown={onMouseDown("voucherNo")} />
                    </th>
                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Date
                      <ResizeHandle onMouseDown={onMouseDown("date")} />
                    </th>
                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Description
                      <ResizeHandle onMouseDown={onMouseDown("description")} />
                    </th>
                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      VAT c...
                      <ResizeHandle onMouseDown={onMouseDown("vatCode")} />
                    </th>
                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Currency
                      <ResizeHandle onMouseDown={onMouseDown("currency")} />
                    </th>

                    <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                      Amount
                      <ResizeHandle onMouseDown={onMouseDown("amount")} />
                    </th>


                    <th className="w-12 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {accountData.map((account) => (
                    <AccountSection
                      key={account.id}
                      account={account}
                      selectedEntries={selectedEntries}
                      toggleEntry={toggleEntry}
                      toggleAccount={toggleAccount}
                      isMobile={false}
                      isExpanded={false}
                      onToggleExpand={() => { }}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {accountData.map((account) => (
                <MobileAccountSection
                  key={account.id}
                  account={account}
                  selectedEntries={selectedEntries}
                  toggleEntry={toggleEntry}
                  toggleAccount={toggleAccount}
                  isExpanded={expandedAccounts.has(account.id)}
                  onToggleExpand={() => toggleAccountExpansion(account.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground">
                1 - {totalEntries} of {totalEntries}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AccountSection({
  account,
  selectedEntries,
  toggleEntry,
  toggleAccount,
  isMobile,
  isExpanded,
  onToggleExpand,
}: {
  account: AccountGroup
  selectedEntries: Set<string>
  toggleEntry: (id: string) => void
  toggleAccount: (accountId: string) => void
  isMobile: boolean
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const allSelected = account.entries.length > 0 && account.entries.every((e) => selectedEntries.has(e.id))

  return account.entries.length > 0 ? (
    <>
      <tr className="bg-muted/30 border-b border-border">
        <td className="border-r border-border p-3">
          <Checkbox checked={allSelected} onCheckedChange={() => toggleAccount(account.id)} />
        </td>
        <td colSpan={9} className="p-3">
          <span className="font-semibold text-blue-600 text-sm sm:text-base">
            {account.code} {account.name}
          </span>
        </td>
      </tr>

      <tr className="border-b border-border">
        <td className="border-r border-border p-3"></td>
        <td colSpan={6} className="border-border p-3 text-sm">
          Opening balance
        </td>
        <td className="text-right font-medium border-border p-3 text-sm tabular-nums">
          {account.openingBalance.toFixed(2)}
        </td>
        <td className="p-3"></td>
      </tr>

      {account.entries.map((entry) => (
        <tr key={entry.id} className="border-b border-border hover:bg-muted/30">
          <td className="border-r border-border p-3">
            <Checkbox checked={selectedEntries.has(entry.id)} onCheckedChange={() => toggleEntry(entry.id)} />
          </td>
          <td className="border-r border-border p-3">
            {entry.hasAttachment && <Paperclip className="h-4 w-4 text-muted-foreground" />}
            <span className="text-blue-600 hover:underline cursor-pointer text-sm">{entry.closed ? "Closed" : ""}</span>
          </td>
          <td className="border-r border-border p-3">
            <span className="text-blue-600 hover:underline cursor-pointer text-sm">{formatVoucherNumberForDisplay(entry.voucherNo)}</span>
          </td>
          <td className="border-r border-border p-3 text-sm">{entry.date}</td>
          <td className="max-w-md truncate border-r border-border p-3 text-sm">
            <Description
              description={entry.description}
              invoiceId={entry.id}
              customerId={entry.customerId}
            />
          </td>
          <td className="border-r border-border p-3 text-sm">{account.code === "3200" ? entry.vatCode : ""}</td>
          <td className="border-r border-border p-3 text-sm">{entry.currency}</td>
          <td className="text-right font-medium border-r border-border p-3 text-sm tabular-nums">
            {entry.amount.toFixed(2)}
          </td>
          <td className="p-3">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </Button>
          </td>
        </tr>
      ))}

      <tr className="border-b-2 border-border">
        <td className="border-r border-border p-3"></td>
        <td colSpan={6} className="border-border p-3 text-sm">
          Closing balance
        </td>
        <td className="text-right font-medium border-border p-3 text-sm tabular-nums">
          {account.closingBalance.toFixed(2)}
        </td>
        <td className="p-3"></td>
      </tr>

    </>
  ) : null
}

function MobileAccountSection({
  account,
  selectedEntries,
  toggleEntry,
  toggleAccount,
  isExpanded,
  onToggleExpand,
}: {
  account: AccountGroup
  selectedEntries: Set<string>
  toggleEntry: (id: string) => void
  toggleAccount: (accountId: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const allSelected = account.entries.length > 0 && account.entries.every((e) => selectedEntries.has(e.id))

  return account.entries.length > 0 ? (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Account Header */}
      <div className="bg-muted/30 border-b border-border p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Checkbox checked={allSelected} onCheckedChange={() => toggleAccount(account.id)} />
          <button onClick={onToggleExpand} className="flex-1 text-left flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-semibold text-blue-600 text-sm sm:text-base truncate">{account.code}</span>
              <span className="text-xs sm:text-sm text-muted-foreground truncate">{account.name}</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>
        </div>

        {/* Summary info when collapsed */}
        {!isExpanded && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Opening</span>
              <p className="font-medium">{account.openingBalance.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entries</span>
              <p className="font-medium">{account.entries.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Closing</span>
              <p className="font-medium">{account.closingBalance.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {/* Opening Balance */}
          <div className="p-3 sm:p-4 bg-background/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Opening balance</span>
              <span className="font-medium text-sm tabular-nums">{account.openingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Entries */}
          {account.entries.map((entry) => (
            <div key={entry.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedEntries.has(entry.id)}
                  onCheckedChange={() => toggleEntry(entry.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  {/* Top row - Status and Voucher */}
                  <div className="flex items-center gap-2 mb-2">
                    {entry.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                    <span className="text-xs font-medium text-blue-600">{formatVoucherNumberForDisplay(entry.voucherNo)}</span>
                    {entry.closed && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">Closed</span>}
                  </div>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground mb-1">{entry.date}</p>

                  {/* Description */}
                  <p className="text-sm text-foreground mb-2 line-clamp-2">{entry.description}</p>

                  {/* VAT and Currency */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    {account.code === "3200" && entry.vatCode && <span>{entry.vatCode}</span>}
                    {entry.currency && <span>{entry.currency}</span>}
                  </div>

                  {/* Amount and Copy button */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium tabular-nums">{entry.amount.toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Closing Balance */}
          <div className="p-3 sm:p-4 bg-muted/20 font-medium border-t-2 border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm">Closing balance</span>
              <span className="text-sm tabular-nums">{account.closingBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null
}

