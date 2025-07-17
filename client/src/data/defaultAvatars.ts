// Default avatar options for new users
export const defaultAvatars = [
  // Nature & Elements
  "🌸", "🌺", "🌻", "🌷", "🌹", "🌿", "🍃", "🌱", "🌳", "🌲",
  "🌊", "🌀", "❄️", "🔥", "⚡", "🌟", "✨", "💫", "🌙", "☀️",
  
  // Animals & Creatures
  "🦋", "🐝", "🐞", "🦜", "🕊️", "🦅", "🦉", "🐬", "🐳", "🦄",
  "🐨", "🦘", "🦌", "🦊", "🐺", "🦁", "🐯", "🐼", "🐸", "🐢",
  
  // Spiritual & Mystical
  "🧘", "🕉️", "☯️", "🔮", "🧿", "🌈", "🎭", "🎨", "🎪", "🎯",
  "🎲", "🎰", "🎮", "🎳", "🎵", "🎶", "🎼", "🎹", "🎸", "🥁",
  
  // Geometric & Abstract
  "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "💎", "🔴", "🟠", "🟡",
  "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩",
  
  // Food & Objects
  "🍎", "🍊", "🍋", "🍌", "🍇", "🍓", "🫐", "🍑", "🥭", "🍍",
  "🥥", "🥝", "🍯", "🍵", "☕", "🧊", "🍮", "🍰", "🧁", "🍪",
  
  // Celestial & Space
  "🌌", "🪐", "🌍", "🌎", "🌏", "🌕", "🌖", "🌗", "🌘", "🌑",
  "🌒", "🌓", "🌔", "⭐", "🌠", "☄️", "🛸", "🚀", "🛰️", "🌤️"
];

// Function to get a random avatar
export function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
  return defaultAvatars[randomIndex];
}

// Function to convert emoji to a data URL for profile picture storage
export function emojiToDataURL(emoji: string, size: number = 100): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  
  if (!context) return '';
  
  // Set background to transparent
  context.clearRect(0, 0, size, size);
  
  // Draw emoji centered
  context.font = `${size * 0.7}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(emoji, size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
}