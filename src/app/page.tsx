import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import StatsSection from '@/components/StatsSection'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

export default async function Home() {
  const currentAuth = await getCurrentUserOrEmployee()
  const isAuthenticated = Boolean(currentAuth)

  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated={isAuthenticated} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <FeaturesSection />
      <StatsSection />
    </div>
  )
}
