'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronRight, GraduationCap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      /* badge drops in with bounce */
      tl.fromTo(
        '.hero-badge',
        { autoAlpha: 0, y: -20, scale: 0.8 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(2)' }
      );

      /* each character of the heading animates in */
      const chars = gsap.utils.toArray<HTMLElement>('.hero-char');
      tl.fromTo(
        chars,
        { autoAlpha: 0, y: 60, rotateX: -40 },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.03,
          duration: 0.8,
          ease: 'power4.out',
        },
        '-=0.3'
      );

      /* subtitle slides up with blur */
      tl.fromTo(
        '.hero-sub',
        { autoAlpha: 0, y: 30, filter: 'blur(8px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7 },
        '-=0.4'
      );

      /* CTA buttons scale in */
      tl.fromTo(
        '.hero-cta',
        { autoAlpha: 0, y: 20, scale: 0.95 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.5)' },
        '-=0.3'
      );

      /* parallax blobs on scroll */
      gsap.to('.hero-blob-1', {
        y: -100,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
      gsap.to('.hero-blob-2', {
        y: -60,
        x: 40,
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: 'bottom top', scrub: 1.5 },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* split text into spans */
  const splitText = (text: string) =>
    text.split('').map((char, i) => (
      <span
        key={i}
        className="hero-char inline-block invisible"
        style={{ perspective: 600 }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));

  return (
    <section ref={sectionRef} className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="hero-blob-1 absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl" />
        <div className="hero-blob-2 absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-100/30 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="hero-badge invisible flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            Built for Competitive Programming
          </span>
        </div>

        {/* Heading with character split */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          {splitText('Where Code Meets ')}
          <span className="hero-gradient text-blue-600 whitespace-nowrap">
            {splitText('Competition')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-sub invisible text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          A modern exam platform with real-time code evaluation, anti-cheating
          safeguards, and gamified learning — designed to push your programming
          skills to the next level.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="hero-cta invisible btn-shine btn-glow inline-flex items-center gap-2 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-7 py-3.5 transition-all shadow-lg shadow-blue-600/20"
          >
            Start Coding
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="hero-cta invisible group inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 rounded-xl px-5 py-3 transition-all duration-300"
          >
            Explore features
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
