import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { X } from 'lucide-react';

interface ChakraMoodTrackerProps {
  sessionDate: string;
  moodType: 'pre' | 'post';
  onClose: () => void;
}

const chakraColors = [
  { color: '#E53E3E', name: 'Root Center', description: 'Grounded & Stable' },      // Red
  { color: '#FF8C00', name: 'Sacral Center', description: 'Creative & Flowing' },    // Orange
  { color: '#FFD700', name: 'Solar Plexus Center', description: 'Confident & Powerful' }, // Yellow
  { color: '#38A169', name: 'Heart Center', description: 'Loving & Compassionate' }, // Green
  { color: '#3182CE', name: 'Throat Center', description: 'Expressive & Clear' },    // Blue
  { color: '#553C9A', name: 'Third Eye Center', description: 'Intuitive & Wise' },   // Indigo
  { color: '#805AD5', name: 'Crown Center', description: 'Spiritual & Connected' },  // Violet
];

export function ChakraMoodTracker({ sessionDate, moodType, onClose }: ChakraMoodTrackerProps) {
  const [user] = useAuthState(auth);
  const [selectedLevel, setSelectedLevel] = useState<number>(4); // Start at heart chakra
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Animation effect for the energy swirl
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/mood/entry', {
        firebaseUid: user.uid,
        sessionDate,
        chakraLevel: selectedLevel,
        moodType,
        notes: null
      });
      onClose();
    } catch (error) {
      console.error('Failed to save mood entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEnergyStyle = (index: number) => {
    const isActive = index <= selectedLevel;
    const pulseIntensity = isActive ? Math.sin((animationPhase + index * 10) * 0.1) * 0.3 + 0.7 : 0.3;
    
    return {
      backgroundColor: isActive ? chakraColors[index].color : '#E2E8F0',
      opacity: pulseIntensity,
      transform: `scale(${isActive ? 1 + Math.sin((animationPhase + index * 15) * 0.1) * 0.1 : 1})`,
      boxShadow: isActive ? `0 0 20px ${chakraColors[index].color}40` : 'none',
      transition: 'all 0.3s ease'
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-2 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              {moodType === 'pre' ? 'How are you feeling right now?' : 'How do you feel after meditation?'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-purple-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-8">
            {/* Energy Conduit Visualization */}
            <div className="relative w-20 h-80">
              {/* Vertical energy line */}
              <div className="absolute left-1/2 top-0 w-1 h-full bg-gradient-to-t from-purple-400 to-purple-600 transform -translate-x-1/2 rounded-full opacity-30" />
              
              {/* Chakra points */}
              <div className="absolute inset-0 flex flex-col-reverse justify-between items-center py-2">
                {chakraColors.map((chakra, index) => (
                  <div
                    key={index}
                    className="relative cursor-pointer group"
                    onClick={() => setSelectedLevel(index)}
                  >
                    {/* Chakra circle */}
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white cursor-pointer transition-all duration-300 hover:scale-125"
                      style={getEnergyStyle(index)}
                    />
                    
                    {/* Energy particles */}
                    {index <= selectedLevel && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-2 h-2 rounded-full animate-ping"
                          style={{ backgroundColor: chakraColors[index].color }}
                        />
                      </div>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="bg-black/80 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                        <div className="font-medium">{chakra.name}</div>
                        <div className="text-xs opacity-80">{chakra.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical Slider */}
            <div className="relative h-80 w-8 flex items-center justify-center">
              <input
                type="range"
                min="0"
                max="6"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                className="slider-vertical h-full w-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  background: `linear-gradient(to top, ${chakraColors[selectedLevel].color} 0%, ${chakraColors[selectedLevel].color} ${((selectedLevel + 1) / 7) * 100}%, #E2E8F0 ${((selectedLevel + 1) / 7) * 100}%, #E2E8F0 100%)`
                }}
              />
            </div>

            {/* Current Selection Display */}
            <div className="text-center space-y-2 w-48">
              <div className="text-2xl font-bold" style={{ color: chakraColors[selectedLevel].color }}>
                {chakraColors[selectedLevel].name}
              </div>
              <div className="text-sm text-gray-600">
                {chakraColors[selectedLevel].description}
              </div>
              <div className="text-xs text-gray-500">
                Level {selectedLevel + 1} of 7
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
              style={{ backgroundColor: chakraColors[selectedLevel].color }}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}