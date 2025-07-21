import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { X } from 'lucide-react';

interface ChakraMoodTrackerProps {
  sessionDate: string;
  moodType: 'pre' | 'post';
  onClose: () => void;
}

const chakraColors = [
  { color: '#000000', name: 'No Awareness', description: 'Disconnected' },          // Black - Level 0
  { color: '#E53E3E', name: 'Root Center', description: 'Grounded & Stable' },      // Red
  { color: '#FF8C00', name: 'Sacral Center', description: 'Creative & Flowing' },    // Orange
  { color: '#FFD700', name: 'Solar Plexus Center', description: 'Confident & Powerful' }, // Yellow
  { color: '#38A169', name: 'Heart Center', description: 'Loving & Compassionate' }, // Green
  { color: '#3182CE', name: 'Throat Center', description: 'Expressive & Clear' },    // Blue
  { color: '#553C9A', name: 'Third Eye Center', description: 'Intuitive & Wise' },   // Indigo
  { color: '#805AD5', name: 'Crown Center', description: 'Spiritual & Connected' },  // Violet
];

export function ChakraMoodTracker({ sessionDate, moodType: initialMoodType, onClose }: ChakraMoodTrackerProps) {
  const [user] = useAuthState(auth);
  const [selectedLevel, setSelectedLevel] = useState<number>(5); // Start at heart chakra (adjusted for 0 index)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [moodType, setMoodType] = useState<'pre' | 'post'>(initialMoodType);
  const [comment, setComment] = useState('');

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
        sessionDate,
        emotionLevel: selectedLevel + 1, // Add 1 to convert from 0-based index to 1-based level
        moodType,
        notes: null,
        comment: comment.trim() || null
      });
      
      // Invalidate mood entries cache to refresh analytics
      queryClient.invalidateQueries({ queryKey: ['/api/mood/entries'] });
      
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
    
    // Special styling for "No Awareness" level
    if (index === 0) {
      return {
        backgroundColor: isActive ? '#000000' : '#E2E8F0',
        opacity: isActive ? 0.9 : 0.3,
        transform: `scale(${isActive ? 1.05 : 1})`,
        boxShadow: isActive ? '0 0 15px rgba(0,0,0,0.5)' : 'none',
        transition: 'all 0.3s ease'
      };
    }
    
    return {
      backgroundColor: isActive ? chakraColors[index].color : '#E2E8F0',
      opacity: pulseIntensity,
      transform: `scale(${isActive ? 1 + Math.sin((animationPhase + index * 15) * 0.1) * 0.1 : 1})`,
      boxShadow: isActive ? `0 0 20px ${chakraColors[index].color}40` : 'none',
      transition: 'all 0.3s ease'
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      <Card className="w-full max-w-md md:max-w-lg bg-white/95 backdrop-blur-sm border-2 border-purple-200 max-h-[90vh] overflow-y-auto touch-none" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 md:p-6 relative">
          {/* X button in top right corner */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-purple-100 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="mb-4 md:mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Track Your Energy</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-center space-y-4 sm:space-y-0 sm:space-x-8">
            {/* Right side: Buttons and energy center info */}
            <div className="flex flex-col space-y-4 w-full sm:w-64 order-first sm:order-last">
              {/* Before/After buttons - full width */}
              <div className="flex w-full bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMoodType('pre')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    moodType === 'pre' 
                      ? 'bg-white text-gray-800 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Before
                </button>
                <button
                  onClick={() => setMoodType('post')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    moodType === 'post' 
                      ? 'bg-white text-gray-800 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  After
                </button>
              </div>
              
              {/* Current Selection Display */}
              <div className="text-center space-y-2">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: chakraColors[selectedLevel].color }}>
                  {chakraColors[selectedLevel].name}
                </div>
                <div className="text-sm text-gray-600">
                  {chakraColors[selectedLevel].description}
                </div>
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  It's Diary time (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How are you feeling? What's on your mind?"
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                  {comment.length}/500 characters
                </div>
              </div>
            </div>

            {/* Left side: Slider and Chakra visualization */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-6">
              {/* Vertical Slider - always on left */}
              <div className="relative h-60 sm:h-80 w-6 sm:w-8 flex items-center justify-center touch-none">
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="slider-vertical h-full w-2 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-none"
                  style={{
                    writingMode: 'vertical-lr' as any,
                    WebkitAppearance: 'slider-vertical',
                    background: `linear-gradient(to top, ${chakraColors[selectedLevel].color} 0%, ${chakraColors[selectedLevel].color} ${((selectedLevel + 1) / 8) * 100}%, #E2E8F0 ${((selectedLevel + 1) / 8) * 100}%, #E2E8F0 100%)`
                  }}
                />
              </div>

              {/* Energy Conduit Visualization - in middle */}
              <div className="relative w-16 sm:w-20 h-60 sm:h-80">
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
                        className={`w-6 sm:w-8 h-6 sm:h-8 rounded-full border-2 transition-all duration-300 hover:scale-125 ${
                          index === 0 ? 'border-gray-400' : 'border-white'
                        }`}
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
                      <div className="absolute left-full ml-2 sm:ml-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        <div className="bg-black/80 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap">
                          <div className="font-medium">{chakra.name}</div>
                          <div className="text-xs opacity-80 hidden sm:block">{chakra.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-4 sm:mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 text-sm"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 text-sm"
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