import { useNavigate } from 'react-router'
import PolicyConsole from '../demo/policies/PolicyConsole'
import { useTitle } from './useTitle'

export default function AppPolicies() {
  const navigate = useNavigate()
  useTitle('Policies')
  return <PolicyConsole variant="page" onOpenDemo={(d) => navigate(`/app/demo/${d}`)} />
}
