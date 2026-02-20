'use client';

import Image from 'next/image';

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/images/codepath.png"
            width={24}
            height={24}
            alt="ShadowCoders"
          />
          <span className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} ShadowCoders
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Developed with{' '}
          <span className="text-red-500">&hearts;</span> by{' '}
          <a
            href="https://nithwin.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Nithwin
          </a>
        </p>
      </div>
    </footer>
  );
}
