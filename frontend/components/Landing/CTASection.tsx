'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* card scales up with clip-path reveal */
      gsap.fromTo(
        '.cta-card',
        { autoAlpha: 0, scale: 0.94, clipPath: 'inset(8% 8% 8% 8% round 24px)' },
        {
          autoAlpha: 1,
          scale: 1,
          clipPath: 'inset(0% 0% 0% 0% round 24px)',
          duration: 1,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      );

      /* text children stagger up with blur clear */
      gsap.fromTo(
        '.cta-text > *',
        { autoAlpha: 0, y: 30, filter: 'blur(6px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          stagger: 0.12,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 78%',
            once: true,
          },
        }
      );

      /* background blobs gently float */
      gsap.to('.cta-blob-1', {
        y: -15,
        x: 10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.cta-blob-2', {
        y: 12,
        x: -8,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="cta-card invisible relative rounded-3xl bg-gray-900 text-white p-10 sm:p-14 text-center overflow-hidden">
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="cta-blob-1 absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="cta-blob-2 absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />

          <div className="cta-text relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to level up?
            </h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Join ShadowCoders and take your coding skills to the next level
              with real challenges and real-time feedback.
            </p>
            <Link
              href="/login"
              className="btn-shine inline-flex items-center gap-2 text-base font-semibold text-gray-900 bg-white hover:bg-gray-100 rounded-xl px-7 py-3.5 transition-colors"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
