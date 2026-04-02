import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import Footer from '@/components/Footer'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

export default async function Home() {
  const currentAuth = await getCurrentUserOrEmployee()
  const isAuthenticated = Boolean(currentAuth)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  )
}
