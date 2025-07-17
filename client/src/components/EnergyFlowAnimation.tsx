import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnergyFlowAnimationProps {
  sessionData: Array<{
    sessionDate: string;
    preEntry?: { emotionLevel: number };
    postEntry?: { emotionLevel: number };
    improvement: number;
  }>;
  isPlaying: boolean;
  currentSessionIndex: number;
}

interface EnergyParticle {
  id: number;
  x: number;
  y: number;
  targetChakra: number;
  opacity: number;
  size: number;
}

const chakraColors = [
  { color: '#E53E3E', name: 'Root Center', position: 0 },      // Red
  { color: '#FF8C00', name: 'Sacral Center', position: 1 },    // Orange
  { color: '#FFD700', name: 'Solar Plexus Center', position: 2 }, // Yellow
  { color: '#38A169', name: 'Heart Center', position: 3 },     // Green
  { color: '#3182CE', name: 'Throat Center', position: 4 },    // Blue
  { color: '#553C9A', name: 'Third Eye Center', position: 5 }, // Indigo
  { color: '#805AD5', name: 'Crown Center', position: 6 },     // Violet
];

export function EnergyFlowAnimation({ sessionData, isPlaying, currentSessionIndex }: EnergyFlowAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [energyParticles, setEnergyParticles] = useState<EnergyParticle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety check for sessionData
  if (!sessionData || sessionData.length === 0) {
    return (
      <div className="relative w-full h-96 bg-gradient-to-b from-purple-900/10 to-blue-900/10 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p>No session data available</p>
          <p className="text-sm">Complete some meditation sessions to see your energy flow</p>
        </div>
      </div>
    );
  }

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Generate energy particles
  useEffect(() => {
    if (!isPlaying || !sessionData[currentSessionIndex]) return;

    const session = sessionData[currentSessionIndex];
    const preLevel = session.preEntry?.emotionLevel || 0;
    const postLevel = session.postEntry?.emotionLevel || 0;
    
    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        id: i,
        x: Math.random() * 20 - 10,
        y: Math.random() * 10,
        targetChakra: Math.min(Math.max(preLevel, postLevel), 6),
        opacity: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
      });
    }
    
    setEnergyParticles(particles);
  }, [isPlaying, currentSessionIndex, sessionData]);

  const getCurrentSession = () => {
    if (!sessionData || sessionData.length === 0) return null;
    const index = Math.max(0, Math.min(currentSessionIndex, sessionData.length - 1));
    return sessionData[index];
  };

  const getChakraIntensity = (chakraIndex: number) => {
    const session = getCurrentSession();
    if (!session) return 0.3;
    
    const preLevel = session.preEntry?.emotionLevel || 0;
    const postLevel = session.postEntry?.emotionLevel || 0;
    const maxLevel = Math.max(preLevel, postLevel);
    
    return chakraIndex <= maxLevel ? 0.8 + Math.sin(animationPhase * 0.1) * 0.2 : 0.3;
  };

  const getBlockageOpacity = (chakraIndex: number) => {
    const session = getCurrentSession();
    if (!session) return 0;
    
    const preLevel = session.preEntry?.emotionLevel || 0;
    const postLevel = session.postEntry?.emotionLevel || 0;
    
    // Show blockages below the pre-meditation level that dissolve to post-meditation level
    if (chakraIndex > preLevel && chakraIndex <= postLevel) {
      return Math.max(0, 0.8 - (animationPhase * 0.02)); // Dissolving blockage
    }
    
    if (chakraIndex > Math.max(preLevel, postLevel)) {
      return 0.4; // Existing blockage
    }
    
    return 0;
  };

  const currentSession = getCurrentSession();
  if (!currentSession) return null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 bg-gradient-to-b from-purple-900/10 to-blue-900/10 rounded-xl overflow-hidden"
    >
      {/* Spine/Central Channel */}
      <div className="absolute left-1/2 top-8 bottom-8 w-1 bg-gradient-to-t from-purple-400 to-purple-600 transform -translate-x-1/2 rounded-full opacity-60" />
      
      {/* Chakra Centers */}
      <div className="absolute left-1/2 top-8 bottom-8 transform -translate-x-1/2 flex flex-col-reverse justify-between items-center py-4">
        {chakraColors.map((chakra, index) => (
          <div key={index} className="relative">
            {/* Main Chakra Circle */}
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-white relative"
              style={{
                backgroundColor: chakra.color,
                opacity: getChakraIntensity(index),
                boxShadow: `0 0 ${20 + Math.sin(animationPhase * 0.1 + index) * 10}px ${chakra.color}60`,
              }}
              animate={{
                scale: 1 + Math.sin(animationPhase * 0.1 + index) * 0.1,
              }}
              transition={{ duration: 0.05 }}
            >
              {/* Energy Pulsing Effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: chakra.color,
                  opacity: 0.3,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              />
              
              {/* Chakra Name */}
              <div className="absolute left-16 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-700 whitespace-nowrap">
                {chakra.name}
              </div>
            </motion.div>
            
            {/* Blockage Visualization */}
            <AnimatePresence mode="wait">
              {getBlockageOpacity(index) > 0 && (
                <motion.div
                  key={`blockage-${index}`}
                  className="absolute inset-0 rounded-full bg-gray-800 border-2 border-gray-600"
                  style={{
                    opacity: getBlockageOpacity(index),
                  }}
                  initial={{ scale: 1.2, opacity: 0.8 }}
                  animate={{ 
                    scale: 1,
                    opacity: getBlockageOpacity(index),
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Cracking effect as blockage dissolves */}
                  <div className="absolute inset-1 rounded-full border border-gray-500 opacity-50" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      
      {/* Energy Flow Particles */}
      <AnimatePresence mode="wait">
        {energyParticles.map((particle) => (
          <motion.div
            key={`particle-${particle.id}`}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              left: `calc(50% + ${particle.x}px)`,
              opacity: particle.opacity,
              background: `radial-gradient(circle, ${chakraColors[particle.targetChakra]?.color || '#fff'}, transparent)`,
            }}
            initial={{ 
              bottom: '10%',
              scale: 0,
            }}
            animate={{
              bottom: `${20 + (particle.targetChakra * 12)}%`,
              scale: [0, 1, 0],
              x: [0, particle.x * 2, 0],
            }}
            exit={{ 
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: particle.id * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Energy Improvement Visualization */}
      {currentSession?.improvement > 0 && (
        <motion.div
          className="absolute top-4 right-4 bg-green-500/20 rounded-lg p-3 border border-green-500/30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-green-700 font-medium text-sm">
            Energy Flow Improved
          </div>
          <div className="text-green-600 text-xs">
            +{currentSession.improvement} levels
          </div>
        </motion.div>
      )}
      
      {/* Session Progress Indicator */}
      <div className="absolute bottom-4 left-4 bg-white/10 rounded-lg p-2 backdrop-blur-sm">
        <div className="text-gray-700 text-xs font-medium">
          Session {currentSessionIndex + 1} of {sessionData.length}
        </div>
        <div className="w-32 h-1 bg-gray-300 rounded-full mt-1">
          <div 
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentSessionIndex + 1) / sessionData.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}