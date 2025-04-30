import { use } from 'react'
import NotFound from '../not-found'

type Props = {
  params: Promise<{
    username: string
  }>
}

function Profile({ params }: Props) {
  const { username } = use(params)
  if (!username) {
    return <NotFound />
  }
  return <div>Profile {username}</div>
}

export default Profile
