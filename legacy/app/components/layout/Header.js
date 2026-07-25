// components/layout/Header.js
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 w-full
        transition-all duration-300 ease-parsian
        ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-ostad py-2"
            : "bg-parsian-concrete py-3"
        }
      `}
    >
      {/* Top Trust Bar - Only visible when not scrolled */}
      {!isScrolled && (
        <div className="bg-parsian-blue text-white py-1.5 text-center">
          <div className="parsian-container">
            <p className="font-heading text-xs md:text-sm tracking-wide">
              <span className="inline-block w-1.5 h-1.5 bg-parsian-gold rounded-full ml-2 animate-pulse"></span>
              ضمانت اصالت کالا • ارسال رایگان بالای ۲ میلیون تومان
              <span className="inline-block w-1.5 h-1.5 bg-parsian-gold rounded-full mr-2 animate-pulse"></span>
            </p>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="parsian-container">
        <div className="flex items-center justify-between gap-4">
          {/* Right Section - Logo & Menu */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Mobile Menu Button */}
            <button className="parsian-touch md:hidden" aria-label="منو">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 md:w-12 md:h-12">
                <div className="absolute inset-0 bg-parsian-gold/20 rounded-lg group-hover:bg-parsian-gold/30 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-heading text-2xl text-parsian-blue">
                    پ
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-xl md:text-2xl text-parsian-blue leading-tight">
                  پارسیان
                </span>
                <span className="hidden md:block font-body text-[10px] text-parsian-steel/60 tracking-wider">
                  ابزار اصیل خودرو
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/shop"
                className="font-body text-parsian-steel hover:text-parsian-blue transition-colors"
              >
                فروشگاه
              </Link>
              <Link
                href="/ostad-clips"
                className="font-body text-parsian-steel hover:text-parsian-blue transition-colors flex items-center gap-1"
              >
                <span>کلیپ‌های استاد</span>
                <span className="bg-parsian-rust text-white text-[10px] px-1.5 py-0.5 rounded-full font-heading">
                  جدید
                </span>
              </Link>
              <Link
                href="/about"
                className="font-body text-parsian-steel hover:text-parsian-blue transition-colors"
              >
                درباره ما
              </Link>
            </nav>
          </div>

          {/* Center - Search (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="جستجوی ابزار، برند یا شماره فنی..."
                className="w-full bg-white border border-parsian-border rounded-lg 
                         py-2.5 pr-10 pl-4 font-body text-sm
                         focus:outline-none focus:border-parsian-gold focus:ring-2 focus:ring-parsian-gold/20
                         transition-all"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-parsian-steel/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Left Section - Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="parsian-touch lg:hidden"
              aria-label="جستجو"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* User Account */}
            <button
              className="parsian-touch hidden sm:flex"
              aria-label="حساب کاربری"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {/* Cart */}
            <button className="parsian-touch relative" aria-label="سبد خرید">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span
                className="absolute -top-1 -left-1 bg-parsian-rust text-white 
                             text-[10px] font-heading w-4 h-4 rounded-full 
                             flex items-center justify-center"
              >
                ۲
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Expandable) */}
        {isSearchOpen && (
          <div className="mt-3 pb-1 lg:hidden animate-slide-up">
            <input
              type="text"
              placeholder="جستجو در پارسیان..."
              className="w-full bg-white border border-parsian-border rounded-lg 
                       py-3 pr-10 pl-4 font-body text-sm
                       focus:outline-none focus:border-parsian-gold"
              autoFocus
            />
          </div>
        )}
      </div>
    </header>
  );
}
