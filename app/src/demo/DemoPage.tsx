import { Navigate, useNavigate, useParams } from 'react-router'
import { isDomain } from './registry'
import { DemoShell } from './shell/DemoShell'

/** Route `/demo/:id`: the demo shell, full viewport. */
export default function DemoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  if (!isDomain(id)) return <Navigate to="/demo/food" replace />
  return <DemoShell domain={id} variant="page" onDomainChange={(d) => navigate(`/demo/${d}`)} />
}
