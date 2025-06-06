type Props = {
  className?: string
  width?: number
  height?: number
}

function Logo({ className, height = 32, width = 29 }: Props) {
  return (
    <svg
      viewBox='0 0 29 32'
      height={height}
      width={width}
      version='1.1'
      id='svg4'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <defs id='defs4' />
      <g transform='rotate(180,14.5,16)' id='g4'>
        <path
          d='M 1.59633,28.6667 0,32 18.6239,22.9333 21.6835,16 Z'
          id='path1'
          style={{ fill: 'currentColor', fillOpacity: 1 }}
        />
        <path
          d='m 1.72936,28.1333 3.8578,-2.4 L 18.0917,8 14.5,0 Z'
          id='path2'
          style={{ fill: 'currentColor', fillOpacity: 1 }}
        />
        <path
          d='m 22.0826,16.1333 -3.0597,6.9334 4.461544,3.934918 L 29,32 Z'
          id='path3'
          style={{ fill: 'currentColor', fillOpacity: 1 }}
        />
        <path
          d='m 0,32 18.333123,-8.306078 -1.475407,3.548861 z'
          id='path4'
          style={{ fill: 'currentColor', fillOpacity: 1, strokeWidth: '1.05927' }}
        />
        <path
          d='M 29,32 18.783436,23.851669 17.299151,27.299891 Z'
          id='path4-0'
          style={{ fill: 'currentColor', fillOpacity: 1, strokeWidth: '0.777413' }}
        />
      </g>
    </svg>
  )
}

export default Logo
