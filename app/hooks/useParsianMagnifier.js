// hooks/useParsianMagnifier.js
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

export function useOstadMagnifier(options = {}) {
  const {
    zoomLevel = 3.5,
    lensSize = 220,
    borderWidth = 3,
    enableLightSimulation = true,
  } = options;

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [lightAngle, setLightAngle] = useState(45); // degrees
  const [showDepthMap, setShowDepthMap] = useState(false);
  const [showReferenceOverlay, setShowReferenceOverlay] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const rafRef = useRef(null);

  // Image dimensions cache
  const [imageDimensions, setImageDimensions] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    displayWidth: 0,
    displayHeight: 0,
  });

  // Calculate lens position with boundary clamping
  const lensPosition = useMemo(() => {
    if (!containerRef.current || !isActive) return { left: 0, top: 0 };

    const containerRect = containerRef.current.getBoundingClientRect();
    const halfLens = lensSize / 2;

    let left = mousePosition.x - halfLens;
    let top = mousePosition.y - halfLens;

    // Clamp to container boundaries
    left = Math.max(0, Math.min(left, containerRect.width - lensSize));
    top = Math.max(0, Math.min(top, containerRect.height - lensSize));

    return { left, top };
  }, [mousePosition, isActive, lensSize]);

  // Calculate background position for the zoomed view
  const zoomBackgroundPosition = useMemo(() => {
    if (!imageRef.current || !isActive) return { x: 0, y: 0 };

    const imgRect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return { x: 0, y: 0 };

    // Calculate percentage position within the displayed image
    const percentX = (mousePosition.x / imgRect.width) * 100;
    const percentY = (mousePosition.y / imgRect.height) * 100;

    return { x: percentX, y: percentY };
  }, [mousePosition, isActive]);

  // Handle mouse/touch movement with RAF for smooth 60fps
  const handleMove = useCallback((e) => {
    if (!containerRef.current) return;

    // Cancel previous RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();

      let clientX, clientY;

      if (e.touches) {
        // Touch event
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        e.preventDefault(); // Prevent scrolling while inspecting
      } else {
        // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate position relative to container
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

      setMousePosition({ x, y });
    });
  }, []);

  const handleEnter = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleLeave = useCallback(() => {
    setIsActive(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  const handleImageLoad = useCallback((e) => {
    const img = e.target;
    setImageDimensions({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.width,
      displayHeight: img.height,
    });
  }, []);

  // Light simulation effect (CSS-based)
  const lightEffectStyle = useMemo(() => {
    if (!enableLightSimulation) return {};

    const rad = (lightAngle * Math.PI) / 180;
    const x = Math.cos(rad) * 100;
    const y = Math.sin(rad) * 100;

    return {
      background: `linear-gradient(${lightAngle}deg, 
        rgba(255,255,255,0.4) 0%, 
        rgba(255,255,255,0) 40%,
        rgba(0,0,0,0.1) 60%,
        rgba(0,0,0,0.3) 100%)`,
      backgroundBlendMode: "overlay",
    };
  }, [lightAngle, enableLightSimulation]);

  // Depth map simulation (edge detection filter)
  const depthMapStyle = useMemo(() => {
    if (!showDepthMap) return {};

    return {
      filter:
        "contrast(200%) brightness(0.8) grayscale(100%) drop-shadow(0 0 2px rgba(196,160,40,0.5))",
    };
  }, [showDepthMap]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  return {
    // Refs
    containerRef,
    imageRef,

    // State
    isActive,
    mousePosition,
    lensPosition,
    zoomBackgroundPosition,
    imageDimensions,
    lightAngle,
    showDepthMap,
    showReferenceOverlay,

    // Setters
    setLightAngle,
    setShowDepthMap,
    setShowReferenceOverlay,

    // Handlers
    handleMove,
    handleEnter,
    handleLeave,
    handleImageLoad,

    // Computed styles
    lightEffectStyle,
    depthMapStyle,

    // Config
    zoomLevel,
    lensSize,
    borderWidth,

    // Utilities
    cleanup,
  };
}
