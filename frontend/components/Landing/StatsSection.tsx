'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { label: 'Students', value: 500, suffix: '+' },
  { label: 'Exams Conducted', value: 100, suffix: '+' },
  { label: 'Questions', value: 1000, suffix: '+' },
  { label: 'Uptime', value: 99.9, suffix: '%' },
];

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* container slides up + fades in */
      gsap.fromTo(
        '.stats-container',
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );

      /* each stat item staggers in with scale bounce */
      gsap.fromTo(
        '.stat-item',
        { autoAlpha: 0, y: 24, scale: 0.9 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          stagger: 0.12,
          duration: 0.6,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            once: true,
          },
        }
      );

      /* counter animation - numbers count up from 0 */
      const counters = gsap.utils.toArray<HTMLElement>('.stat-number');
      counters.forEach((el) => {
        const target = parseFloat(el.dataset.value || '0');
        const suffix = el.dataset.suffix || '';
        const isDecimal = target % 1 !== 0;
        const obj = { val: 0 };

        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            once: true,
          },
          onUpdate() {
            el.innerText = (isDecimal ? obj.val.toFixed(1) : Math.round(obj.val).toString()) + suffix;
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="stats-container invisible grid grid-cols-2 sm:grid-cols-4 gap-6 p-8 rounded-2xl bg-gray-50/80 dark:bg-slate-900/70 border border-gray-100 dark:border-slate-800 shadow-sm dark:shadow-none">
          {stats.map((s) => (
            <div key={s.label} className="stat-item invisible text-center">
              <div
                className="stat-number text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100"
                data-value={s.value}
                data-suffix={s.suffix}
              >
                0{s.suffix}
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
