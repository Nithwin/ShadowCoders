"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Menu from "../utils/Menu";
import { NavItems } from "@/constants";
import gsap from "gsap";
import Link from "next/link";


const Header = () => {
  useEffect(() => {
    gsap.from(".anime", {
      opacity:0,
      y:-50,
      duration:1.2,
      delay:0.3,
      ease:"power3.out"
    })
  })
  const [isOpen, setOpen] = useState(false);
  return (
    <nav id="nav" className="anime w-full p-4 flex flex-col lg:flex-row z-50 fixed ">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            height={100}
            width={100}
            className="size-12 opacity-75"
            src={"/images/logo-light.png"}
            alt="Logo"
          />
          <p className="font-aerospace text-secondary/60 uppercase text-lg">
            ShadowCoders
          </p>
        </div>
        <Menu
          className="lg:hidden cursor-pointer text-secondary/40 size-10"
          isOpen={isOpen}
          setOpen={() => setOpen(!isOpen)}
        />
      </div>
      <ul className={`${isOpen ? "translate-y-0" : "-translate-y-200"} lg:translate-0 transition-transform ease-linear delay-200`}>
        {NavItems.map((item, index) => (
          <li key={index}>
            <p>{item.name}</p>
          </li>
        ))}
        <li className="relative">
          <button className="relative cursor-pointer">
            <Link href={"/login"}>
            <span className="bg-gray-500/40 absolute h-14 w-5 -top-1 -left-1 -z-10 lg:z-0 rounded-lg"></span>
            <p className="bg-gray-950/80 backdrop-blur-xl h-12 w-32 lg:w-28 flex-center rounded-lg hover:scale-105 transition-transform ease-in delay-100">
              Begin
            </p>
            <span className="bg-gray-500/40 absolute h-14 w-5 -top-1 -right-1 -z-10 rounded-lg"></span>
            </Link>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Header;
