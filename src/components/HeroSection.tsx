import Link from 'next/link'
import Image from 'next/image'

interface HeroSectionProps {
  isAuthenticated?: boolean
}

export default function HeroSection({ isAuthenticated = false }: HeroSectionProps) {
  const primaryCtaLabel = isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'
  const primaryCtaHref = isAuthenticated ? '/dashboard' : '/register'

  return (
    <section className="bg-gradient-to-br from-[#E0F4FF] via-[#C8EAFF] to-[#A8D8F8] pt-16 sm:pt-20 relative overflow-hidden min-h-screen flex items-center">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-[#31BCFF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-72 h-72 bg-[#0EA5E9]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: Text + CTA */}
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-[#31BCFF]/30 rounded-full px-4 py-1.5 text-sm font-medium text-[#0EA5E9]">
              <span className="w-2 h-2 bg-[#31BCFF] rounded-full animate-pulse" />
              Employee Scheduling Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">
              Simplify{' '}
              <span className="text-[#31BCFF]">Employee</span>
              <br />
              <span className="text-[#31BCFF]">Scheduling</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
              A clear and intuitive platform to streamline your work shifts easily
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={primaryCtaHref}
                className="bg-[#31BCFF] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#0EA5E9] transition-all duration-200 shadow-lg shadow-[#31BCFF]/30 hover:shadow-[#31BCFF]/50 text-center transform hover:scale-105"
              >
                {primaryCtaLabel}
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              {['Enterprise Ready', 'GDPR Compliant', '24/7 Support'].map((badge) => (
                <span
                  key={badge}
                  className="bg-white/70 backdrop-blur-sm border border-white/80 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <Image
              src="/hero.png"
              alt="ZenLink Employee Scheduling Platform on laptop and mobile"
              width={680}
              height={480}
              className="w-full max-w-xl lg:max-w-none h-auto"
              style={{ mixBlendMode: 'multiply' }}
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  )
}
