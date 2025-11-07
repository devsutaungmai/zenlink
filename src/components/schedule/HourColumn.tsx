export default function HourColumn() {
  return (
    <div>
      <div className="p-1 sm:p-2 md:p-3 font-medium text-center border-r bg-gray-100 h-[60px] sm:h-[72px]"></div>
      {Array.from({ length: 23 }, (_, hour) => hour + 1).map(hour => (
        <div
          key={hour}
          className="border-b border-r p-1 sm:p-2 md:p-3 bg-gray-100 h-[50px] sm:h-[60px] flex items-start"
        >
          <div className="text-[10px] sm:text-sm md:text-base font-medium text-gray-900">{hour}:00</div>
        </div>
      ))}
    </div>
  )
}