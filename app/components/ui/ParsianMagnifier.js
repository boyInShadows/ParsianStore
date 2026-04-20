// components/ui/OstadMagnifier.js
"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useOstadMagnifier } from "@/hooks/useOstadMagnifier";

// Memoized sub-components for performance
const Lens = memo(
  ({
    position,
    size,
    borderWidth,
    borderColor,
    zoomLevel,
    backgroundImage,
    backgroundPosition,
    lightEffect,
    depthEffect,
  }) => {
    const lensStyle = {
      position: "absolute",
      left: `${position.left}px`,
      top: `${position.top}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      border: `${borderWidth}px solid ${borderColor}`,
      boxShadow:
        "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(196,160,40,0.3), inset 0 0 20px rgba(0,0,0,0.2)",
      pointerEvents: "none",
      zIndex: 50,
      overflow: "hidden",
      backdropFilter: "blur(0.5px)",
    };

    const zoomedImageStyle = {
      position: "absolute",
      width: "100%",
      height: "100%",
      backgroundImage: `url("${backgroundImage}")`,
      backgroundSize: `${zoomLevel * 100}%`,
      backgroundPosition: `${backgroundPosition.x}% ${backgroundPosition.y}%`,
      backgroundRepeat: "no-repeat",
      imageRendering: "crisp-edges", // Better for engraving text
    };

    return (
      <div style={lensStyle} className="ostad-lens">
        <div style={zoomedImageStyle} className="ostad-lens-zoom" />
        <div
          style={lightEffect}
          className="ostad-lens-light absolute inset-0"
        />
        <div
          style={depthEffect}
          className="ostad-lens-depth absolute inset-0"
        />

        {/* Lens Glint Animation */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-white/10 rounded-full blur-sm animate-glint" />
        </div>

        {/* Crosshair (Ostad Alignment Tool) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-parsian-gold/30" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-parsian-gold/30" />
        </div>
      </div>
    );
  },
);

Lens.displayName = "Lens";

const ControlPanel = memo(
  ({
    lightAngle,
    onLightAngleChange,
    showDepthMap,
    onDepthMapToggle,
    showReference,
    onReferenceToggle,
    expectedEngraving,
  }) => {
    return (
      <div className="parsian-card p-4 space-y-4 animate-slide-up">
        {/* Light Angle Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-heading text-sm text-parsian-steel flex items-center gap-2">
              <span>🔦</span>
              <span>زاویه نور استاد</span>
            </label>
            <span className="font-body text-xs text-parsian-steel/60 persian-number">
              {lightAngle}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={lightAngle}
            onChange={(e) => onLightAngleChange(Number(e.target.value))}
            className="w-full h-2 bg-parsian-concrete rounded-lg appearance-none cursor-pointer
                   accent-parsian-gold"
            style={{
              background: `linear-gradient(90deg, 
              rgba(196,160,40,0.3) 0%, 
              rgba(196,160,40,0.8) ${lightAngle / 3.6}%, 
              #EBEAE6 ${lightAngle / 3.6}%)`,
            }}
          />
        </div>

        {/* Tool Toggles */}
        <div className="flex gap-2">
          <button
            onClick={onDepthMapToggle}
            className={`
            flex-1 parsian-touch rounded-lg font-body text-sm
            transition-all duration-200
            ${
              showDepthMap
                ? "bg-parsian-blue text-white shadow-card"
                : "bg-parsian-concrete text-parsian-steel hover:bg-parsian-border/50"
            }
          `}
          >
            <span className="flex items-center justify-center gap-2">
              <span>📏</span>
              <span>نمایش عمق حک</span>
            </span>
          </button>

          <button
            onClick={onReferenceToggle}
            className={`
            flex-1 parsian-touch rounded-lg font-body text-sm
            transition-all duration-200
            ${
              showReference
                ? "bg-parsian-gold text-parsian-dark shadow-card"
                : "bg-parsian-concrete text-parsian-steel hover:bg-parsian-border/50"
            }
          `}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🔍</span>
              <span>مقایسه فونت</span>
            </span>
          </button>
        </div>

        {/* Reference Overlay (when active) */}
        {showReference && expectedEngraving && (
          <div className="bg-parsian-blue/5 border border-parsian-gold/30 rounded-lg p-3">
            <p className="font-heading text-xs text-parsian-gold mb-1">
              الگوی حکاکی اصل:
            </p>
            <p className="font-body text-sm text-parsian-steel tracking-wider font-mono">
              {expectedEngraving}
            </p>
          </div>
        )}
      </div>
    );
  },
);

ControlPanel.displayName = "ControlPanel";

// Main Component
export default function OstadMagnifier({
  imageSrc,
  imageAlt = "ابزار پارسیان",
  expectedEngraving = null,
  onVerificationComplete = null,
  className = "",
}) {
  const {
    containerRef,
    imageRef,
    isActive,
    lensPosition,
    zoomBackgroundPosition,
    lightAngle,
    showDepthMap,
    showReferenceOverlay,
    setLightAngle,
    setShowDepthMap,
    setShowReferenceOverlay,
    handleMove,
    handleEnter,
    handleLeave,
    handleImageLoad,
    lightEffectStyle,
    depthMapStyle,
    zoomLevel,
    lensSize,
    borderWidth,
  } = useOstadMagnifier({
    zoomLevel: 4,
    lensSize: 240,
    borderWidth: 3,
  });

  const [isVerificationMode, setIsVerificationMode] = useState(false);

  // Verification status (mock - would connect to actual image analysis)
  const verificationStatus = useMemo(() => {
    return {
      laserDepth: true,
      fontMatch: true,
      materialFinish: true,
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Magnifier Container */}
      <div
        ref={containerRef}
        className="parsian-zoom relative overflow-hidden rounded-xl bg-parsian-engrave"
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchMove={handleMove}
        onTouchStart={handleEnter}
        onTouchEnd={handleLeave}
      >
        {/* Main Image */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt={imageAlt}
          onLoad={handleImageLoad}
          className="w-full h-auto object-contain select-none"
          draggable={false}
        />

        {/* Magnifier Lens */}
        {isActive && (
          <Lens
            position={lensPosition}
            size={lensSize}
            borderWidth={borderWidth}
            borderColor="#C4A028"
            zoomLevel={zoomLevel}
            backgroundImage={imageSrc}
            backgroundPosition={zoomBackgroundPosition}
            lightEffect={lightEffectStyle}
            depthEffect={depthMapStyle}
          />
        )}

        {/* Verification Mode Overlay */}
        {isVerificationMode && (
          <div className="absolute bottom-4 left-4 right-4 glass-parsian rounded-lg p-4 animate-slide-up">
            <div className="space-y-2">
              <h4 className="font-heading text-parsian-blue flex items-center gap-2">
                <span>🛡️</span>
                <span>تایید اصالت استاد</span>
              </h4>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm">عمق حکاکی لیزری</span>
                  <span
                    className={
                      verificationStatus.laserDepth
                        ? "text-green-600"
                        : "text-parsian-rust"
                    }
                  >
                    {verificationStatus.laserDepth ? "✓ تایید" : "✗ نامعتبر"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm">تطابق فونت</span>
                  <span
                    className={
                      verificationStatus.fontMatch
                        ? "text-green-600"
                        : "text-parsian-rust"
                    }
                  >
                    {verificationStatus.fontMatch ? "✓ تایید" : "✗ نامعتبر"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm">پرداخت سطح</span>
                  <span
                    className={
                      verificationStatus.materialFinish
                        ? "text-green-600"
                        : "text-parsian-rust"
                    }
                  >
                    {verificationStatus.materialFinish
                      ? "✓ تایید"
                      : "✗ نامعتبر"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsVerificationMode(false)}
                className="w-full parsian-btn-primary mt-2"
              >
                بستن
              </button>
            </div>
          </div>
        )}

        {/* Hint Text (only when inactive) */}
        {!isActive && (
          <div
            className="absolute bottom-4 right-4 bg-parsian-dark/70 backdrop-blur-sm 
                        text-white font-body text-xs px-3 py-1.5 rounded-full
                        border border-white/10"
          >
            <span className="flex items-center gap-2">
              <span>🔍</span>
              <span>برای بررسی حکاکی، موس را حرکت دهید</span>
            </span>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <ControlPanel
        lightAngle={lightAngle}
        onLightAngleChange={setLightAngle}
        showDepthMap={showDepthMap}
        onDepthMapToggle={() => setShowDepthMap(!showDepthMap)}
        showReference={showReferenceOverlay}
        onReferenceToggle={() => setShowReferenceOverlay(!showReferenceOverlay)}
        expectedEngraving={expectedEngraving}
      />

      {/* Verification Button */}
      <button
        onClick={() => setIsVerificationMode(!isVerificationMode)}
        className="w-full parsian-btn-gold"
      >
        <span className="flex items-center justify-center gap-2">
          <span>🛡️</span>
          <span>استعلام اصالت از استاد</span>
        </span>
      </button>
    </div>
  );
}
