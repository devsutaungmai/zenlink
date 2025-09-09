import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-[#31BCFF] to-[#0EA5E9] text-white pt-16 sm:pt-20 md:pt-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Employee Scheduling Made{' '}
            <span className="block sm:inline">Simple</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed opacity-90">
            Streamline your workforce management with our comprehensive time tracking and scheduling solution.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center pt-4 sm:pt-6">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white text-[#31BCFF] px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg text-center"
            >
              Start Free Trial
            </Link>
            <Link
              href="#demo"
              className="w-full sm:w-auto border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-white/10 transition-all duration-200 transform hover:scale-105 text-center"
            >
              Book Demo
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 sm:pt-12 space-y-4">
            <p className="text-sm sm:text-base opacity-75">
              Trusted by 1000+ businesses worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 opacity-60">
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">Enterprise Ready</span>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">GDPR Compliant</span>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-sm font-medium">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
    </section>
  )
}