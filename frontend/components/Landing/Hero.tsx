"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useEffect, useRef } from "react";
import { ArrowDown,ChevronsRight } from "lucide-react";
import Link from "next/link";


gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const videoRef = useRef(null);
  const sectionRef = useRef(null);
  useEffect(() => {
    gsap.from(".text-anime", {
      opacity: 0,
      duration: 1.2,
      ease: "power3.out",
      y: 50,
      delay: 0.5,
      stagger: 0.3,
    });
    gsap.from(videoRef.current, {
      opacity: 0,
      duration: 1.2,
      ease: "power3.in",
      delay: 0.2,
    });
  }, []);
  useGSAP(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // Hide next text initially
    gsap.set(".next", { opacity: 0, y: 20 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=200%",
        pin: true,
        scrub: 1,
        markers: false,
      },
    });

    const videoDuration = 8;
    const fadeOutOffset = 4; // seconds before video ends

    // Animate video
    tl.to(video, { currentTime: videoDuration, duration: videoDuration });

    // Fade out first text a few seconds before video ends
    tl.fromTo(
      ".text-anime",
      { opacity: 1, y: 0 },
      { opacity: 0, y: -20, duration: 1 },
      `-=${fadeOutOffset}`
    );

    // Fade in next text 1 second after first fades
    tl.fromTo(
      ".next",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1 },
      `-=${fadeOutOffset - 1}`
    );
  });

  return (
    <section ref={sectionRef} className="min-h-dvh relative">
      <div className="h-screen absolute top-0 z-0 left-0 w-full">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover scale-105 opacity-70"
          src="/videos/ninja.mp4"
        ></video>
      </div>
      <div className="relative h-full flex-col flex-center">
        <div className="flex-col gap-5 flex-center z-50 relative h-full mt-15">
          <h1 className="text-anime text-6xl lg:text-8xl text-center text-secondary/30 font-aerospace font-semibold">
            Shadow
            <br />
            <span className="text-blue-300/70">Coders</span>
          </h1>
          <h3 className="text-anime text-secondary/70 text-lg px-4 text-center font-alan-sans font-semibold">
            Level Up Your Coding Skills Another Level
          </h3>
        </div>
        <div className=" z-50 relative flex items-center justify-center mb-15">
          <p className="text-anime text-center text-secondary/40 flex-center gap-3 text-lg cursor-pointer">
            Learn More <ArrowDown className="text-lg" />
          </p>
        </div>
      </div>

      <div className="next absolute top-0 left-0 w-full h-full flex flex-col gap-3 items-center justify-center z-50">
        <h1 className="text-6xl lg:text-8xl text-center text-secondary/30 font-aerospace">
          Level Up
        </h1>
        <h3 className="text-secondary/90 text-lg px-4 text-center max-w-[35rem] font-alan-sans font-medium">
          A new challenge awaits. Embrace the shadows, master the code, and
          ascend to a higher plane of programming.
        </h3>
        <div className="w-full flex justify-center py-4">
          <Link href={"/login"} className="mx-auto relative cursor-pointer ">
            <span className="bg-secondary/50 absolute h-15 rounded-xl px-5 -top-1 -left-1"></span>
            <span className="bg-secondary/50 absolute h-15 rounded-xl px-5 -top-1 -right-1"></span>
            <p className="text-secondary text-xl lg:text-2xl rounded-xl bg-gray-600/70 font-semibold backdrop-blur-lg h-13 px-4 flex-center hover:scale-105 transition-transform ease-in delay-100">
            Accept Challenge</p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
