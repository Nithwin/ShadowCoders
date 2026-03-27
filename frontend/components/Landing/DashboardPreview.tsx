'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Monitor } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function DashboardPreview() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* main card: 3D entrance from below with perspective */
      gsap.fromTo(
        wrapRef.current,
        { autoAlpha: 0, y: 80, rotateX: 8, scale: 0.95 },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          scale: 1,
          duration: 1,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top 88%',
            once: true,
          },
        }
      );

      /* skeleton bars animate in with stagger */
      gsap.fromTo(
        '.dash-skeleton',
        { autoAlpha: 0, scaleX: 0 },
        {
          autoAlpha: 1,
          scaleX: 1,
          stagger: 0.06,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      );

      /* slight 3D tilt on scroll (scrub) */
      gsap.to(wrapRef.current, {
        rotateX: -2,
        y: -20,
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top 60%',
          end: 'bottom 20%',
          scrub: 1.5,
        },
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-8">
      <div className="max-w-5xl mx-auto px-6" style={{ perspective: 1200 }}>
        <div
          ref={wrapRef}
          className="invisible relative rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-2 shadow-2xl shadow-gray-200/50 dark:shadow-black/20"
        >
          <div className="rounded-xl bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
              <div className="dash-skeleton invisible flex-1 mx-4 h-5 bg-gray-100 dark:bg-slate-800 rounded-md origin-left" />
            </div>
            {/* Mock dashboard */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-blue-600" />
                </div>
                <div className="dash-skeleton invisible h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded-md origin-left" />
                <div className="dash-skeleton invisible ml-auto h-3 w-20 bg-gray-100 dark:bg-slate-800 rounded origin-left" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['bg-blue-50 dark:bg-blue-900/30', 'bg-teal-50 dark:bg-teal-900/30', 'bg-violet-50 dark:bg-violet-900/30', 'bg-amber-50 dark:bg-amber-900/30'].map(
                  (bg, i) => (
                    <div key={i} className={`${bg} rounded-xl p-4 space-y-2`}>
                      <div className="dash-skeleton invisible h-3 w-16 bg-gray-200/60 dark:bg-slate-700 rounded origin-left" />
                      <div className="dash-skeleton invisible h-6 w-12 bg-gray-300/50 dark:bg-slate-600 rounded origin-left" />
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-32 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800" />
                <div className="h-32 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
