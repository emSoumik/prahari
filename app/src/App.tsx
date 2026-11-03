import { lazy, Suspense } from 'react'
import ErrorBoundary from './ErrorBoundary'
import { Route, Routes } from 'react-router'

const Deck = lazy(() => import('./presentation/Deck'))
const DemoHub = lazy(() => import('./demo/DemoHub'))
const DemoPage = lazy(() => import('./demo/DemoPage'))
const PoliciesPage = lazy(() => import('./demo/policies/PoliciesPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Deck />} />
        <Route path="/demo" element={<DemoHub />} />
        <Route path="/demo/:id" element={<ErrorBoundary><DemoPage /></ErrorBoundary>} />
        <Route path="/policies" element={<ErrorBoundary><PoliciesPage /></ErrorBoundary>} />
      </Routes>
    </Suspense>
  )
}
