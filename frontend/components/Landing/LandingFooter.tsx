'use client';

import Image from 'next/image';
import { Github } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 dark:border-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/images/codepath.png"
            width={24}
            height={24}
            alt="ShadowCoders"
          />
          <span className="text-sm text-gray-400 dark:text-slate-400">
            &copy; {new Date().getFullYear()} ShadowCoders
          </span>
        </div>
        <p className="text-sm text-gray-400 dark:text-slate-400">
          Developed with{' '}
          <span className="text-red-500">&hearts;</span> by{' '}
          <a
            href="https://nithwin.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
          >
            Nithwin
          </a>
        </p>
        <a
          href="https://github.com/Nithwin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Nithwin GitHub Profile"
          title="Nithwin GitHub Profile"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </footer>
  );
}
