import { useState, useEffect } from 'react';
import { ChakraMoodTracker } from './ChakraMoodTracker';

interface MoodTrackerIconProps {
  sessionDate: string;
  className?: string;
}

export function MoodTrackerIcon({ sessionDate, className = '' }: MoodTrackerIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Animation effect for the icon
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 100);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const chakraColors = [
    '#E53E3E', // Red
    '#FF8C00', // Orange
    '#FFD700', // Yellow
    '#38A169', // Green
    '#3182CE', // Blue
    '#553C9A', // Indigo
    '#805AD5', // Violet
  ];

  const getAnimatedColor = () => {
    const colorIndex = Math.floor(animationPhase / 14.3) % chakraColors.length;
    return chakraColors[colorIndex];
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-3 rounded-full transition-all duration-300 hover:scale-110 ${className}`}
        style={{
          background: `radial-gradient(circle, ${getAnimatedColor()}20, transparent 70%)`,
          border: `2px solid ${getAnimatedColor()}40`,
        }}
        title="Track your energy"
      >
        {/* Chakra symbol */}
        <div className="relative w-6 h-6">
          {/* Central dot */}
          <div
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{
              backgroundColor: getAnimatedColor(),
              boxShadow: `0 0 8px ${getAnimatedColor()}60`,
              transform: `translate(-50%, -50%) scale(${1 + Math.sin(animationPhase * 0.1) * 0.2})`,
            }}
          />
          
          {/* Surrounding energy rings */}
          {[0, 1, 2].map(ringIndex => (
            <div
              key={ringIndex}
              className="absolute top-1/2 left-1/2 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{
                width: `${12 + ringIndex * 8}px`,
                height: `${12 + ringIndex * 8}px`,
                borderColor: `${getAnimatedColor()}${60 - ringIndex * 20}`,
                animation: `spin ${3 + ringIndex}s linear infinite`,
                opacity: 0.6 + Math.sin((animationPhase + ringIndex * 20) * 0.1) * 0.4,
              }}
            />
          ))}
        </div>

        {/* Pulsing background effect */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${getAnimatedColor()}10, transparent 70%)`,
            transform: `scale(${1 + Math.sin(animationPhase * 0.08) * 0.1})`,
          }}
        />
      </button>

      {/* Mood Tracker Modal */}
      {isOpen && (
        <ChakraMoodTracker
          sessionDate={sessionDate}
          moodType="pre"
          onClose={() => setIsOpen(false)}
        />
      )}

      <style>{`
        @keyframes spin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}