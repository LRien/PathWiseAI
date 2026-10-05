import React from 'react'
import HeroSection from './HomePageSections/HeroSection'
import MbtiShowCase from './HomePageSections/MbtiShowCase'
import NoteSection from './HomePageSections/NoteSection'


const HomePage = () => {
  return (
    <div>
      <HeroSection />
      <MbtiShowCase />
      <NoteSection />

    </div>
  )
}

export default HomePage