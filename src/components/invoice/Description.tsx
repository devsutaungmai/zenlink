import Link from "next/link"

export function Description({
  description,
  invoiceId,
}: {
  description: string
  invoiceId?: string
  customerId?: string
}) {
  const parts = description.split(" ")
  const customerId = parts[5] ?? '';

  // Expected: ["Faktura", "nummer", "1", "til", "Ibadet", "cust_12345"]
  if (parts.length !== 6) {
    return <span>{description}</span>
  }

  return (
    <span className="flex gap-1 truncate">
      <span>{parts[0]}</span>
      <span>{parts[1]}</span>

      {/* Invoice number */}
      <Link
        href={`/dashboard/invoices/create?invoiceId=${invoiceId}&copy=true&overview=true`}
        className="text-blue-600 hover:underline"
      >
        {parts[2]}
      </Link>

      <span>{parts[3]}</span>

      {/* Customer */}
      <Link
        href={`/dashboard/customers/create?customerId=${customerId}&overview=true`}
        className="text-blue-600 hover:underline"
      >
        {parts[4]}
      </Link>
    </span>
  )
}
