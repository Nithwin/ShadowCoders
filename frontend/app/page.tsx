import About from '@/components/Landing/About'
import Header from '@/components/Landing/Header'
import Hero from '@/components/Landing/Hero'
import React from 'react'

function Home() {
  return (
    <section className='bg-primary relative'>
      <Header />
      <Hero />
    </section>
  )
}

export default Home