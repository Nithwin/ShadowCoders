"use client";
import React, { SVGProps } from "react";

interface SwordProps extends SVGProps<SVGSVGElement> {
  isOpen: boolean;
  setOpen: () => void;
}

const SwordMenu = ({ isOpen, setOpen, className, ...props }: SwordProps) => {
  return (
    <svg
      onClick={setOpen}
      className={`cursor-pointer ${className}`} 
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M184.302 0C151.865 18.0781 124.098 39.3672 97.5949 62.9516L106.507 71.3742L128.698 49.182L133.862 54.3332L111.816 76.3801L121.423 85.4371C145.564 59.2965 167.361 31.9531 184.302 0ZM25.6223 93.432L14.4895 104.577L41.4062 131.494C31.1367 148.554 16.5898 161.343 0 172.082L10.9621 183.043C21.8242 166.573 35.0863 152.507 51.6238 141.711L78.4668 168.554L89.6113 157.409C81.423 152.678 73.5644 147.448 66.1984 141.662C73.1769 134.697 114.569 92.2875 121.423 85.4371L111.816 76.3801L55.5906 132.616C53.8074 130.961 52.0695 129.249 50.3664 127.514L106.507 71.3742L97.5949 62.9516C90.4543 69.9266 48.3008 109.874 41.0523 117.114C35.1664 109.853 29.966 101.974 25.6223 93.432Z"
        className={`origin-center transform transition-transform duration-500 ease-in-out ${
          isOpen ? "rotate-45 translate-y-15" : "rotate-0 translate-0"
        }`}
      />

      <path
        d="M0 0C32.4367 18.0781 60.2039 39.3672 86.707 62.9516L77.7953 71.3742L55.6039 49.182L50.4398 54.3332L72.4859 76.3801L62.8789 85.4371C38.7375 59.2965 16.9414 31.9531 0 0ZM158.68 93.432L169.812 104.577L142.896 131.494C153.165 148.554 167.712 161.343 184.302 172.082L173.34 183.043C162.478 166.573 149.216 152.507 132.678 141.711L105.835 168.554L94.6906 157.409C102.879 152.678 110.737 147.448 118.104 141.662C111.125 134.697 69.7332 92.2875 62.8789 85.4371L72.4859 76.3801L128.711 132.616C130.495 130.961 132.232 129.249 133.936 127.514L77.7953 71.3742L86.707 62.9516C93.8476 69.9266 136.001 109.874 143.25 117.114C149.136 109.853 154.336 101.974 158.68 93.432Z"
        className={`origin-center transform transition-transform duration-500 ease-in-out ${
          isOpen ? "-rotate-45 -translate-y-15" : "rotate-0 translate-0"
        }`}
      />
    </svg>
  );
};

export default SwordMenu;
