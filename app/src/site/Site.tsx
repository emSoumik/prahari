import { useEffect } from 'react'
import { Architecture } from './Architecture'
import { Compare } from './Compare'
import { Faq } from './Faq'
import { Footer } from './Footer'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { Incidents } from './Incidents'
import { LiveDemo } from './LiveDemo'
import { Models } from './Models'
import { Nav } from './Nav'
import { Overview } from './Overview'
import { Policies } from './Policies'
import './site.css'

export default function Site() {
  useEffect(() => {
    document.title = 'Prahari · Pre-execution guard for AI agents'
    const prev = document.body.style.background
    document.body.style.background = '#fff'
    return () => {
      document.body.style.background = prev
    }
  }, [])

  return (
    <div className="site">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Overview />
        <Incidents />
        <HowItWorks />
        <LiveDemo />
        <Compare />
        <Policies />
        <Models />
        <Architecture />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
