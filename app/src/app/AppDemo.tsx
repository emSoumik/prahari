import { Navigate, useNavigate, useParams } from 'react-router'
import { isDomain } from '../demo/registry'
import { DemoShell } from '../demo/shell/DemoShell'
import { useTitle } from './useTitle'

/** Route `/app/demo/:id`: the demo shell, full screen. */
export default function AppDemo() {
  const { id } = useParams()
  const navigate = useNavigate()
  useTitle('Demo')
  if (!isDomain(id)) return <Navigate to="/app/demo/food" replace />
  return <DemoShell domain={id} variant="page" onDomainChange={(d) => navigate(`/app/demo/${d}`)} />
}
