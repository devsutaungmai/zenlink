import { ClockIcon, ChartBarIcon, WalletIcon } from '@heroicons/react/24/outline'

const features = [
  {
    title: "Staff Scheduling",
    description: "Create and manage employee schedules with ease.",
    icon: ClockIcon,
  },
  {
    title: "Time Tracking",
    description: "Track employee hours and attendance automatically.",
    icon: ChartBarIcon,
  },
  {
    title: "Payroll Integration",
    description: "Seamlessly sync with your payroll system.",
    icon: WalletIcon,
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-gray-800">
            Everything you need to manage your workforce
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Streamline your business operations with our comprehensive suite of workforce management tools
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 sm:p-8 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-105 border border-gray-100">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#31BCFF] to-[#0EA5E9] rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-gray-800">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}