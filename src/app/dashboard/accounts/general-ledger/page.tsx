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
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface LedgerEntry {
  id: string
  closed: boolean
  voucherNo: string
  date: string
  description: string
  vatCode?: string
  currency?: string
  amount: number
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
  const today = new Date();

  const [dateRange, setDateRange] = useState({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0]
  });

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

  const moveDateRange = (direction: 'prev' | 'next') => {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    if (direction === 'prev') {
      start.setDate(start.getDate() - diffDays)
      end.setDate(end.getDate() - diffDays)
    } else {
      start.setDate(start.getDate() + diffDays)
      end.setDate(end.getDate() + diffDays)
    }

    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    })
  }

  const totalEntries = accountData.reduce((sum, acc) => sum + acc.entries.length, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-foreground">General ledger</h1>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-blue-600">Filters</span>
          </Button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search" className="pl-9" />
          </div>

          <SelectPrimitive.Root defaultValue="all">
            <SelectPrimitive.Trigger className="inline-flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted w-[180px]">
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
            <TabsPrimitive.List className="inline-flex items-center rounded-lg border border-border bg-background">
              <TabsPrimitive.Trigger
                value="all"
                className="px-4 py-2 text-sm font-medium transition-colors data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=inactive]:text-foreground hover:bg-muted rounded-l-lg"
              >
                All entries
              </TabsPrimitive.Trigger>
              <TabsPrimitive.Trigger
                value="open"
                className="px-4 py-2 text-sm font-medium transition-colors data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=inactive]:text-foreground hover:bg-muted rounded-r-lg"
              >
                Open entries
              </TabsPrimitive.Trigger>
            </TabsPrimitive.List>
          </TabsPrimitive.Root>

          <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2">
            <span className="text-sm text-foreground">
              {dateRange.startDate} - {dateRange.endDate}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveDateRange('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveDateRange('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="icon">
            <Download className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading ledger data...</div>
          </div>
        ) : accountData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">No ledger entries found for this period</div>
          </div>
        ) : (
          <>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-12 border-r border-border p-3 text-left">
                      <Checkbox />
                    </th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">Closed</th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">Voucher no.</th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">Date</th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">Description</th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">VAT c...</th>
                    <th className="border-r border-border p-3 text-left text-sm font-medium">Currency</th>
                    <th className="border-r border-border p-3 text-right text-sm font-medium">Amount</th>
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
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">
                1 - {totalEntries} of {totalEntries}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                <ChevronRight className="h-4 w-4" />
              </Button>
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
}: {
  account: AccountGroup
  selectedEntries: Set<string>
  toggleEntry: (id: string) => void
  toggleAccount: (accountId: string) => void
}) {
  const allSelected = account.entries.length > 0 && account.entries.every((e) => selectedEntries.has(e.id))

  return (
    <>
      {/* Account Header */}
      <tr className="bg-muted/30 border-b border-border">
        <td className="border-r border-border p-3">
          <Checkbox checked={allSelected} onCheckedChange={() => toggleAccount(account.id)} />
        </td>
        <td colSpan={9} className="p-3">
          <span className="font-semibold text-blue-600">
            {account.code} {account.name}
          </span>
        </td>
      </tr>

      {/* Opening Balance */}
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

      {/* Entries */}
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
            <span className="text-blue-600 hover:underline cursor-pointer text-sm">{entry.voucherNo}</span>
          </td>
          <td className="border-r border-border p-3 text-sm">{entry.date}</td>
          <td className="max-w-md truncate border-r border-border p-3 text-sm">{entry.description}</td>
          <td className="border-r border-border p-3 text-sm">{account.code === "3200" ? entry.vatCode : ""}</td>
          <td className="border-r border-border p-3 text-sm col-span-2">{entry.currency}</td>
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

      {/* Closing Balance */}
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
  )
}