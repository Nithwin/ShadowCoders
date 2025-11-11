import { redirect } from 'next/navigation'

function Home() {
  redirect('/login');
  // return (
  //   <section className='bg-primary relative'>
  //     <Header />
  //     <Hero />
  //   </section>
  // )
}

export default Home