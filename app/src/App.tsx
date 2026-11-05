import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import ErrorBoundary from './ErrorBoundary'

const Site = lazy(() => import('./site/Site'))
// The keynote is a local, dev-only extra. The folder is git-ignored, so a fresh clone builds without it.
const deckLoader = import.meta.env.DEV ? import.meta.glob<{ default: ComponentType }>('./presentation/Deck.tsx')['./presentation/Deck.tsx'] : undefined
const Deck = deckLoader ? lazy(deckLoader) : null
const AppLayout = lazy(() => import('./app/AppLayout'))
const Overview = lazy(() => import('./app/Overview'))
const Settings = lazy(() => import('./app/Settings'))
const AppDemo = lazy(() => import('./app/AppDemo'))
const AppPolicies = lazy(() => import('./app/AppPolicies'))

function LegacyDemo() {
  const { id } = useParams()
  return <Navigate to={`/app/demo/${id ?? 'food'}`} replace />
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Site />} />
        {Deck && <Route path="/keynote" element={<Deck />} />}
        <Route path="/app/demo/:id" element={<ErrorBoundary><AppDemo /></ErrorBoundary>} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="policies" element={<ErrorBoundary><AppPolicies /></ErrorBoundary>} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/demo" element={<Navigate to="/app" replace />} />
        <Route path="/demo/:id" element={<LegacyDemo />} />
        <Route path="/policies" element={<Navigate to="/app/policies" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
