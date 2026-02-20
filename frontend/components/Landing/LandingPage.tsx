import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import StatsSection from './StatsSection';
import DashboardPreview from './DashboardPreview';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import CTASection from './CTASection';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <StatsSection />
      <DashboardPreview />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
