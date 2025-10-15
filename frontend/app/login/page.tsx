"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const Login = () => {
  const [showPassword, setShowPassword] = useState<boolean | undefined>(false);
  const [email, setEmail] = useState<string | undefined>();
  const [password, setPassword] = useState<string | undefined>()
  const handleLogin = (e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  return (
    <section id="login" className="bg-primary min-h-dvh flex-center">
      <div className="box">
        <div className="flex items-center gap-2 justify-center">
          <Image 
          src={"/images/logo-dark.png"}
          width={50}
          height={50}
          alt="Logo"
          />
          <h1>ShadowCoders</h1>
        </div>
        <form onSubmit={handleLogin} className="" id="form">
          <div>
            <input
              className=""
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@nandhaengg.org"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <input
              className=""
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={`${!showPassword ? "password" : "text"}`}
              required
            />
            <span className="ms-auto text-sm flex items-center gap-1">
              <input
                onChange={() => setShowPassword(!showPassword)}
                className="h-4 w-4 border-2 border-gray-400 rounded-md
             flex items-center justify-center"
                checked={showPassword}
                type="checkbox"
              />
              Show Password
            </span>
          </div>
          <div>
            <button type="submit" className="cursor-pointer">
              Login
            </button>
          </div>
        </form>
        <div>
          <Link href={"/forgot-password"}>
            <p className="text-center underline cursor-pointer">Forgot Password ?</p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Login;
