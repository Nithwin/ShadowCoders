'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { UserPlus, FileEdit, Play, Award } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Sign Up',
    desc: 'Create your account in seconds. Students get enrolled by their admin automatically.',
    accent: '#2563eb',
  },
  {
    num: '02',
    icon: FileEdit,
    title: 'Take an Exam',
    desc: 'Browse available exams, enter the coding environment, and start solving challenges.',
    accent: '#7c3aed',
  },
  {
    num: '03',
    icon: Play,
    title: 'Live Evaluation',
    desc: 'Code is evaluated in real-time with sandboxed execution. See results instantly.',
    accent: '#0d9488',
  },
  {
    num: '04',
    icon: Award,
    title: 'Earn & Climb',
    desc: 'Earn points, climb leaderboards, and redeem rewards. Track your growth over time.',
    accent: '#d97706',
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* heading: clip-path wipe from left */
      gsap.fromTo(
        '.hiw-heading',
        { autoAlpha: 0, x: -30, clipPath: 'inset(0% 100% 0% 0%)' },
        {
          autoAlpha: 1,
          x: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.9,
          ease: 'power4.out',
          scrollTrigger: { trigger: '.hiw-heading', start: 'top 88%', once: true },
        }
      );

      /* steps: each triggered individually with slide + rotate */
      const stepEls = gsap.utils.toArray<HTMLElement>('.hiw-step');
      stepEls.forEach((step, i) => {
        gsap.fromTo(
          step,
          { autoAlpha: 0, y: 40, x: i % 2 === 0 ? -20 : 20, rotateZ: i % 2 === 0 ? -2 : 2 },
          {
            autoAlpha: 1,
            y: 0,
            x: 0,
            rotateZ: 0,
            duration: 0.7,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
              start: 'top 90%',
              once: true,
            },
          }
        );
      });

      /* connector lines draw in from left */
      gsap.fromTo(
        '.hiw-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          stagger: 0.2,
          duration: 0.9,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: '.hiw-grid', start: 'top 78%', once: true },
        }
      );

      /* step numbers: count up effect */
      const numEls = gsap.utils.toArray<HTMLElement>('.hiw-num');
      numEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, scale: 0.5 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.5,
            delay: i * 0.12,
            ease: 'back.out(2)',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 sm:py-20 bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <div className="hiw-heading invisible text-center mb-16">
          <span className="inline-flex items-center text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 mb-4">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            From signup to{' '}
            <span className="text-violet-600">leaderboard</span> in minutes
          </h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            A streamlined flow designed to get you coding fast.
          </p>
        </div>

        {/* Steps */}
        <div className="hiw-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((s, i) => (
            <div key={s.num} className="hiw-step invisible relative text-center sm:text-left">
              {/* Connector line (hidden on mobile, shown lg) */}
              {i < steps.length - 1 && (
                <div className="hiw-line hidden lg:block absolute top-8 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-gray-200 origin-left" />
              )}

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 mb-4 transition-transform duration-300 hover:scale-110"
                style={{ backgroundColor: s.accent + '12' }}
              >
                <s.icon className="w-6 h-6" style={{ color: s.accent }} />
              </div>

              <span
                className="hiw-num invisible text-xs font-bold tracking-widest uppercase mb-2 block"
                style={{ color: s.accent }}
              >
                Step {s.num}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {s.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
