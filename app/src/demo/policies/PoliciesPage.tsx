import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import PolicyConsole from './PolicyConsole'

export default function PoliciesPage() {
  const navigate = useNavigate()
  return (
    <main className="min-h-full bg-paper">
      <nav className="mx-auto flex w-full max-w-[1120px] items-center gap-5 px-6 pt-6 text-[14px] text-ink-3">
        <Link to="/" className="inline-flex items-center gap-1 transition-colors [@media(hover:hover)]:hover:text-ink">
          <ArrowLeft size={14} />
          Presentation
        </Link>
        <Link to="/demo" className="transition-colors [@media(hover:hover)]:hover:text-ink">
          Demo hub
        </Link>
      </nav>
      <PolicyConsole variant="page" onOpenDemo={(d) => navigate(`/demo/${d}`)} />
    </main>
  )
}
