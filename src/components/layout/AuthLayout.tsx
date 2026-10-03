"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-red-600 p-4">
      {/* Textura diagonal decorativa (tokens-de-marca.md §5.2) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_14px)]"
      />

      {/* Orbs decorativos (tokens-de-marca.md §5.2) */}
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-24 h-[22rem] w-[22rem] rounded-full bg-white/[.06]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-white/[.06]" />

      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-login">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/watts_logo_rojo.png"
            alt="Caramelos Watts"
            width={100}
            height={100}
            priority
            className="rounded-2xl object-cover"
          />

          {(title || subtitle) && (
            <div className="text-center">
              {title && (
                <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
