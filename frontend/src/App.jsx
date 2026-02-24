import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import Home from './pages/Home'
import PolicyTracker from './pages/PolicyTracker'
import DeploymentDashboard from './pages/DeploymentDashboard'
import FundingIntelligence from './pages/FundingIntelligence'
import SafetyAnalytics from './pages/SafetyAnalytics'
import ResourceLibrary from './pages/ResourceLibrary'
import News from './pages/News'
import Admin from './pages/Admin'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/policies" element={<PolicyTracker />} />
          <Route path="/deployments" element={<DeploymentDashboard />} />
          <Route path="/funding" element={<FundingIntelligence />} />
          <Route path="/safety" element={<SafetyAnalytics />} />
          <Route path="/resources" element={<ResourceLibrary />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
