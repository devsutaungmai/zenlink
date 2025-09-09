export default function StatsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9]">
      <div className="container mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-white">
          Trusted by businesses worldwide
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
          <StatItem number="10k+" label="Active Users" />
          <StatItem number="50+" label="Countries" />
          <StatItem number="98%" label="Satisfaction Rate" />
          <StatItem number="24/7" label="Support" />
        </div>
      </div>
    </section>
  )
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="p-4 sm:p-6 transform hover:scale-105 transition-transform duration-200">
      <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">{number}</div>
      <div className="text-sm sm:text-base text-white/80 font-medium">{label}</div>
    </div>
  )
}