import React, { use } from 'react'

type Props = {
  params: Promise<{
    id: string
  }>
}

function Post({ params }: Props) {
  const { id } = use(params)
  return <div>{id}</div>
}

export default Post
