import Link from "next/link"

export function Description({
  description,
  invoiceId,
}: {
  description: string
  invoiceId?: string
  customerId?: string
}) {

  const matches = description.match(/\(([^)]+)\)/g)

  if (!matches || matches.length < 4) {
    return <span>{description}</span>
  }
  const descriptionPart = matches[0].replace(/[()]/g, "")
  const invoiceNumber = matches[1].replace(/[()]/g, "")
  const customerName = matches[2].replace(/[()]/g, "")
  const customerId = matches[3].replace(/[()]/g, "")

  return (
    <span className="flex gap-1 truncate">
      <span>{descriptionPart}</span>

      {/* Invoice number */}
      <Link
        href={`/dashboard/invoices/create?invoiceId=${invoiceId}&copy=true&overview=true`}
        className="text-blue-600 hover:underline"
      >
        {invoiceNumber}
      </Link>


      {/* Customer */}
      <Link
        href={`/dashboard/customers/${customerId}/edit?overview=true`}
        className="text-blue-600 hover:underline"
      >
        ({customerName})
      </Link>
    </span>
  )
}
