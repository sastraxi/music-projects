import React, { useState, lazy } from 'react'

import './App.css'
import CategorySelector from './CategorySelector'
import Settings from '~/settings/Settings';
import { useCategory } from '~/state/app';
import Spinner from '~/components/Spinner';

// FIXME: regenerate background video; lost it when I deleted the netlify config
// import BackgroundVideo from '~/assets/smoke-1080p-30fps.mp4'
import { hasDismissedSplash, setDismissedSplash } from '~/state/local';
import SplashScreen from '~/components/SplashScreen';
import { deviceType } from 'detect-it';
import MouseSupportRequired from './MouseSupportRequired';

const SingleIdea = lazy(() => import('~/prompts/SingleIdea'));
const ContrastPrompt = lazy(() => import('~/prompts/ContrastPrompt'));
const PlaylistPrompt = lazy(() => import('~/prompts/PlaylistPrompt'));
const ChordsPrompt = lazy(() => import('~/prompts/ChordsPrompt'));

const App = () => {
  const category = useCategory()
  // const [dismissedSplash, setLocalDismissed] = useState<boolean>(hasDismissedSplash() ?? false)

  // /////////////////////////////////////////////
  // // const [videoLoaded, setVideoLoaded] = useState(false)

  // // const backgroundVideo = <video
  // //   id="background-video"
  // //   src={BackgroundVideo}
  // //   className={videoLoaded ? 'loaded' : ''}
  // //   onLoadedData={() => setVideoLoaded(true)}
  // //   autoPlay loop muted
  // // />

  // const dismissSplash = () => {
  //     setLocalDismissed(true)
  //     setDismissedSplash(true)
  // }

  // if (!dismissedSplash) return (
  //   <>
  //     {/* { backgroundVideo } */}
  //     <SplashScreen onDismiss={dismissSplash} />
  //   </>  
  // )

  if (deviceType == 'touchOnly') {
    return <MouseSupportRequired />
  }

  const LOADING_SPINNER = (<Spinner size="40px" />)
  return (
    <div id="root">
      {/* { backgroundVideo } */}
      <div className="top-bar">
        <CategorySelector />
        <Settings />
      </div>
      <React.Suspense fallback={LOADING_SPINNER}>
        { category.type === "single idea" && <SingleIdea /> }
        { category.type === "contrast" && <ContrastPrompt /> }
        { category.type === "playlist" && <PlaylistPrompt /> }
        { category.type === "chords" && <ChordsPrompt /> }
      </React.Suspense>
    </div>
  )
}

export default App

