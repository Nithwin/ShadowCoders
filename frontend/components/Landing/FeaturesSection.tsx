'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Shield,
  BarChart3,
  Zap,
  Code2,
  Trophy,
  Clock,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Shield,
    title: 'Anti-Cheating Engine',
    desc: 'Tab-switch detection, clipboard blocking, and AI-powered proctoring keep exams fair.',
    accent: '#2563eb',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    desc: 'Live dashboards with submission tracking, leaderboards, and performance insights.',
    accent: '#0d9488',
  },
  {
    icon: Zap,
    title: 'Instant Evaluation',
    desc: 'Automated code evaluation with sandboxed execution and detailed scoring.',
    accent: '#7c3aed',
  },
  {
    icon: Code2,
    title: 'Multi-language Support',
    desc: 'Write and test code in C, C++, Java, Python, and more - right in the browser.',
    accent: '#d97706',
  },
  {
    icon: Trophy,
    title: 'Gamified Experience',
    desc: 'Points, rankings, redeemable rewards, and achievement badges to boost engagement.',
    accent: '#dc2626',
  },
  {
    icon: Clock,
    title: 'Timed Assessments',
    desc: 'Configurable timers, auto-submission, and question pools for rigorous testing.',
    accent: '#0891b2',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* heading: clip-path reveal from bottom */
      gsap.fromTo(
        '.feat-heading',
        { autoAlpha: 0, y: 30, clipPath: 'inset(100% 0% 0% 0%)' },
        {
          autoAlpha: 1,
          y: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.8,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: '.feat-heading',
            start: 'top 88%',
            once: true,
          },
        }
      );

      /* cards: staggered scale + rotation reveal */
      const cards = gsap.utils.toArray<HTMLElement>('.feat-card');
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          {
            autoAlpha: 0,
            y: 50,
            scale: 0.92,
            rotateY: i % 2 === 0 ? -5 : 5,
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            rotateY: 0,
            duration: 0.7,
            delay: i * 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              once: true,
            },
          }
        );
      });

      /* card icon bars animate width on scroll */
      gsap.fromTo(
        '.feat-icon-bar',
        { scaleX: 0 },
        {
          scaleX: 1,
          stagger: 0.08,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.feat-grid',
            start: 'top 80%',
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <div className="feat-heading invisible text-center mb-14">
          <span className="inline-flex items-center text-xs font-semibold text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-full px-3 py-1 mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
            Everything you need to run{' '}
            <span className="text-blue-600">fair exams</span>
          </h2>
          <p className="text-gray-500 dark:text-slate-300 mt-3 max-w-lg mx-auto">
            From code evaluation to anti-cheating - built for educators who care
            about integrity and students who love challenges.
          </p>
        </div>

        {/* Grid */}
        <div className="feat-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5" style={{ perspective: 800 }}>
          {features.map((f) => (
            <div
              key={f.title}
              className="feat-card invisible group relative rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-gray-100/80 dark:hover:shadow-black/20 transition-all duration-300"
            >
              {/* accent bar at top */}
              <div
                className="feat-icon-bar absolute top-0 left-6 right-6 h-0.5 rounded-b origin-left"
                style={{ backgroundColor: f.accent + '40' }}
              />

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: f.accent + '14' }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.accent }} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
