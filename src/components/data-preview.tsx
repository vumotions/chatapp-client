import React from 'react'

type Props = {
  data: any
}

function DataPreview({ data }: Props) {
  return (
    <pre className='mt-2 w-full max-w-[340px] rounded-md bg-slate-950 p-4'>
      <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
    </pre>
  )
}

export default DataPreview
