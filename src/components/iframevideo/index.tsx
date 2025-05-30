import React from 'react'

interface IPropsIframeVideo {
  linkVideo: string
  width: string
  height: string
  className?: string
  enableJSAPI?: boolean
  autoplay?: boolean
}
const buildYoutubeEmbedLink = ({ enableJSAPI = false, autoplay = false }) => {
  const params = new URLSearchParams()
  if (autoplay) {
    params.set('autoplay', '1')
    params.set('mute', '1')
    params.set('controls', '0')
    params.set('showinfo', '0')
    params.set('loop', '1')
  }
  if (enableJSAPI) {
    params.set('rel', '0')
    params.set('enablejsapi', '1')
  }
  if (enableJSAPI || autoplay) {
    return `?${params.toString()}`
  }
  return ''
}
const IframeVideo = ({ linkVideo, width, height, className, enableJSAPI, autoplay }: IPropsIframeVideo) => {
  if (linkVideo.includes('youtube.com')) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${linkVideo.split('v=')[1]?.split('&')?.[0]}${buildYoutubeEmbedLink({ enableJSAPI, autoplay })}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        referrerPolicy='strict-origin-when-cross-origin'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('youtu.be')) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${linkVideo.split('/')[3]}${buildYoutubeEmbedLink({ enableJSAPI, autoplay })}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        referrerPolicy='strict-origin-when-cross-origin'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('facebook.com')) {
    // Giá trị cố định cho URL src của Facebook
    const fbWidth = 560 // Giá trị pixel cố định cho plugin
    const fbHeight = 315 // Tỷ lệ 16:9 với width=560

    return (
      <div
        className={className}
        style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}
      >
        <iframe
          src={`https://www.facebook.com/plugins/video.php?height=${fbHeight}&href=${encodeURIComponent(linkVideo)}&show_text=false&width=${fbWidth}&t=0`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          scrolling='no'
          frameBorder='0'
          allowFullScreen
          allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share'
        ></iframe>
      </div>
    )
  } else if (linkVideo.includes('instagram.com')) {
    return (
      <iframe
        src={`https://www.instagram.com/p/${
          linkVideo.split('/p/')[1] || linkVideo.split('/tv/')[1] || linkVideo.split('/reel/')[1]
        }/embed`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('tiktok.com')) {
    return (
      <iframe
        src={`https://www.tiktok.com/embed/${linkVideo.split('/video/')[1]}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('twitch.tv')) {
    return (
      <iframe
        src={`https://player.twitch.tv/?video=${linkVideo.split('videos/')[1] || linkVideo.split('/clip/')[1]}&parent=${process.env.NEXT_PUBLIC_DOMAIN}`}
        width={width}
        height={height}
        frameBorder='0'
        scrolling='no'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('vimeo.com')) {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${linkVideo.split('vimeo.com/')[1]}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('bilibili.com')) {
    return (
      <iframe
        src={`https://player.bilibili.com/player.html?bvid=${linkVideo?.split('video/')?.[1]?.split('/')?.[0]}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('v.qq.com')) {
    return (
      <iframe
        src={`https://v.qq.com/txp/iframe/player.html?vid=${linkVideo.split('/cover/')[1].split('/')[1]}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else if (linkVideo.includes('youku.com')) {
    const videoId = linkVideo.split('id_')[1].split('.')[0]
    return (
      <iframe
        src={`https://player.youku.com/embed/${videoId}`}
        width={width}
        height={height}
        frameBorder='0'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
        className={className}
      ></iframe>
    )
  } else {
    return null
  }
}

export default IframeVideo
