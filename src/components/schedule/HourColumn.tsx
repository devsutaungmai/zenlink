export default function HourColumn() {
  return (
    <div>
      <div className="p-1 font-medium text-center border-r bg-gray-100 h-[40px]"></div>
      {Array.from({ length: 24 }, (_, hour) => hour).map(hour => (
        <div
          key={hour}
          className="border-b border-r p-1 bg-gray-100 h-[24px] flex items-start justify-center"
        >
          <div className="text-[11px] font-medium text-gray-700">{hour.toString().padStart(2, '0')}:00</div>
        </div>
      ))}
    </div>
  )
}