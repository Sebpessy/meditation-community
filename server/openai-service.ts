import OpenAI from "openai";

/**
 * OpenAI Service for AI-powered mood analysis and insights
 * 
 * This service will be used to:
 * - Analyze mood patterns and comments
 * - Generate personalized insights about emotional journey
 * - Provide meditation recommendations based on mood data
 * - Create summaries of meditation progress
 * 
 * Note: This requires OPENAI_API_KEY environment variable to be set
 */

let openai: OpenAI | null = null;

// Initialize OpenAI client only if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface MoodAnalysisRequest {
  userId: number;
  moodEntries: Array<{
    sessionDate: string;
    emotionLevel: number;
    moodType: 'pre' | 'post';
    comment?: string;
    createdAt: string;
  }>;
  timeframe: 'week' | 'month' | 'all';
}

export interface MoodInsight {
  summary: string;
  patterns: string[];
  recommendations: string[];
  improvements: string[];
  overallTrend: 'improving' | 'stable' | 'declining';
}

export async function generateMoodInsights(request: MoodAnalysisRequest): Promise<MoodInsight> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const { moodEntries, timeframe } = request;
  
  // Filter entries by timeframe
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeframe) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'all':
      cutoffDate.setFullYear(2000); // Far past date
      break;
  }

  const filteredEntries = moodEntries.filter(entry => 
    new Date(entry.createdAt) >= cutoffDate
  );

  // Prepare data for AI analysis
  const moodData = filteredEntries.map(entry => ({
    date: entry.sessionDate,
    type: entry.moodType,
    level: entry.emotionLevel + 1, // Convert 0-6 to 1-7
    comment: entry.comment || 'No comment',
    chakra: getChakraName(entry.emotionLevel)
  }));

  const prompt = `
You are a mindfulness and meditation expert analyzing a user's mood tracking data. 
Please provide insights based on the following mood entries from the past ${timeframe}:

${JSON.stringify(moodData, null, 2)}

Please analyze this data and provide insights in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of their overall emotional journey",
  "patterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "overallTrend": "improving" | "stable" | "declining"
}

Focus on:
- Chakra energy patterns and emotional balance
- Pre vs post meditation improvements
- Recurring themes in comments
- Specific, actionable meditation recommendations
- Positive reinforcement of progress

Be encouraging and supportive while providing practical insights.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a compassionate mindfulness expert providing personalized meditation insights. Always respond in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || "Your meditation journey is unique and valuable.",
      patterns: result.patterns || [],
      recommendations: result.recommendations || [],
      improvements: result.improvements || [],
      overallTrend: result.overallTrend || 'stable'
    };
  } catch (error) {
    console.error('Error generating mood insights:', error);
    throw new Error('Failed to generate mood insights');
  }
}

function getChakraName(level: number): string {
  const chakras = [
    'Root Center', 'Sacral Center', 'Solar Plexus Center', 
    'Heart Center', 'Throat Center', 'Third Eye Center', 'Crown Center'
  ];
  return chakras[level] || 'Unknown';
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}