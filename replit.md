# Replit.md - Serene Space Meditation Application

## Overview

This is a full-stack meditation application built with React frontend and Express backend. The application provides daily meditation sessions with live chat functionality, user authentication through Firebase, and admin capabilities for managing meditation templates and schedules.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 23, 2025
- ✅ **IMPLEMENTED COMPREHENSIVE REFERRAL SYSTEM**: Created complete referral system with unique codes for user growth
- ✅ Added database schema for referrals, quantum love points tracking, and user referral codes  
- ✅ Built backend API endpoints for referral validation, tracking, and automatic completion
- ✅ Created frontend referrals page with code sharing, point tracking, and referral history
- ✅ Added navigation links to access referrals page from both desktop and mobile menus
- ✅ Enhanced auth page to detect referral codes from URL parameters with visual feedback
- ✅ Implemented automatic referral completion when referred users complete 5+ minute meditation sessions
- ✅ Added reward system: 100 Quantum Love points for referrer, 25 points for referred user
- ✅ Updated referral messaging from "Join Serene Space" to "Join Evolving Hearts" branding
- ✅ Created automatic referral code generation for users without codes
- ✅ Fixed database schema constraints and successfully deployed referral system

### July 21, 2025
- ✅ Fixed authentication header handling to support both firebase-uid and x-firebase-uid headers
- ✅ Resolved mood analytics page data loading issues 
- ✅ Updated energy tracker UI: removed cursor on left of energy centers
- ✅ Changed "Share your thoughts (optional)" to "It's Diary time (Optional)"
- ✅ Fixed energy level values to use 1-based indexing (No awareness=1, Root=2, up to Crown=8)
- ✅ Updated mood analytics page to properly display 1-based energy levels
- ✅ Re-enabled daily chat flush system to clear messages at midnight CST (Dallas, TX time)
- ✅ Updated chat to display all messages from the current day (12:00 AM to 11:59 PM CST)
- ✅ Increased message limit from 30 to 1000 to ensure all daily messages are shown
- ✅ Renamed "Gardien Angel" to "Gardian Angel" throughout the entire application
- ✅ Replaced Garden Angel calendar with Admin Schedule calendar (non-clickable version)
- ✅ Added duration display for each scheduled meditation in calendar view
- ✅ Implemented week, month, and year views for Garden Angel calendar
- ✅ Added recent schedules list showing template details and durations
- ✅ Implemented 2-button solution (List/Calendar toggle) in Gardian Angel tab header
- ✅ Created list view for meditation schedules with full details and duration display
- ✅ Fixed all remaining "Garden Angel" spelling to "Gardian Angel" across the entire codebase
- ✅ Removed vertical slider from energy tracker on all devices - users now interact directly with chakra visualization
- ✅ **MAJOR DATA RESET**: Completely flushed all historical meditation session data (310 sessions deleted)
- ✅ Reset all 52 users to exactly 5 minutes meditation time for today (July 21, 2025) only
- ✅ Enhanced admin Last Login column to display both date and time instead of date only
- ✅ Prepared clean slate for accurate session time tracking with realistic baseline values
- ✅ **FIXED CRITICAL WEBSOCKET ISSUE**: Resolved WebSocket disconnections during fullscreen and picture-in-picture modes
- ✅ Enhanced session tracking to continue during fullscreen/PiP - time tracking now works seamlessly in all video modes
- ✅ Added fullscreen and PiP event listeners to maintain WebSocket connections during video mode changes
- ✅ **FIXED ONLINE COUNT DISCREPANCY**: Resolved issue where online count showed "7 online" but only 4 avatars displayed
- ✅ Cleared stale grace period users that were inflating online count without showing avatars
- ✅ Added debug endpoints (/api/debug/grace-period and /api/debug/clear-grace-period) for monitoring and clearing stuck users
- ✅ Enhanced WebSocket message handling to properly process online-count-updated events
- ✅ Added comprehensive debug logging for online count calculation (active vs grace period users)
- ✅ **FIXED SESSION TIME CALCULATION BUG**: Resolved impossible meditation durations showing 19.7 hours instead of realistic times
- ✅ Reset 6 users with unrealistic session times (>2 hours) to 5-minute baseline for accurate tracking
- ✅ Steven, Adri Pie, Andrea Casas, MP, Miguel Ferrer Novoa, and SUSANA MARIN now show correct meditation times
- ✅ **FIXED LAST LOGIN TRACKING**: Corrected Steven's last login time from incorrect timezone to show accurate July 21st activity
- ✅ **PRODUCTION WEBSOCKET DEBUGGING**: Enhanced grace period functionality with comprehensive debug endpoints for newself.me deployment
- ✅ Added debug endpoints for testing grace period functionality on production domain (/api/debug/grace-period-test)
- ✅ **PRODUCTION ONLINE COUNT FIX**: Implemented robust grace period cleanup with automatic expiry checks and periodic cleanup
- ✅ Added emergency cleanup endpoint (/api/debug/force-cleanup) for immediate ghost user removal on newself.me
- ✅ Enhanced online count accuracy with real-time grace period validation and automatic cleanup every 10 minutes
- ✅ **MEDITATION SESSION DURATION CLEANUP**: Implemented one-time cleanup capping all sessions above 60 minutes to exactly 60 minutes
- ✅ Updated 3 sessions with excessive durations: Adri Pie (817.6 min), Grace Anadon (572.7 min), MP (548.6 min) - all now capped at 60 minutes
- ✅ Added production-ready session cleanup endpoint (/api/admin/cleanup-session-durations) for newself.me deployment
- ✅ Verified maximum session duration is now 60.0 minutes across all 58 meditation sessions
- ✅ **PRODUCTION GHOST USER FIX**: Fixed online count discrepancy on newself.me (10 online vs 6 avatars)
- ✅ Ran emergency cleanup removing 4 ghost users stuck in grace period on production
- ✅ Enhanced periodic cleanup system: reduced interval to 5 minutes with aggressive 10-minute ghost user detection
- ✅ Improved WebSocket connection stability to prevent future ghost user accumulation on production domain
- ✅ **TIMEZONE FIX**: Fixed CST timezone calculation bug causing premature date changes and chat message resets
- ✅ Corrected getCSTDate function across client components to properly use Dallas, TX Central Time
- ✅ Fixed server-side timezone handling to prevent messages from being wiped at wrong times
- ✅ Sessions now properly track time without accumulating unrealistic durations

### July 20, 2025
- ✅ Created Gardien Angel page with calendar view access for moderation purposes
- ✅ Added Gardien Angel navigation links to both desktop and mobile menus
- ✅ Implemented role-based access control for Gardien Angel page in RouteGuard
- ✅ Enhanced backend user interface to include isGardenAngel property
- ✅ Added calendar and list view functionality for Gardien Angels to monitor meditation schedules
- ✅ Integrated comprehensive chat moderation features with message deletion for Gardien Angels
- ✅ Restored Last Login and Time Spent columns in admin user management interface
- ✅ Added clickable usernames in chat that navigate to admin page for user management
- ✅ Renamed "Garden Angel" to "Gardien Angel" throughout the application
- ✅ Updated Admin Users section to display "Gardien Angel" instead of "Garden Angel" 
- ✅ Added "(Gardien Angel)" role indicator in live chat between user names and timestamps
- ✅ Applied Gardien Angel indicator to both desktop and mobile chat interfaces
- ✅ Fixed session durations endpoint returning correct meditation time data instead of mood entries
- ✅ Updated mood analytics default filter from "Last week" to "Current week" for better user experience
- ✅ Implemented proper week calculation logic starting on Monday as requested
- ✅ Fixed mobile and desktop chat heart button styling for consistent filled state display
- ✅ Resolved mood analytics time display showing 0 - now shows accurate meditation session durations
- ✅ Added proper error handling and logging to session durations endpoint for debugging
- ✅ Fixed data type conversion for session durations from string to number format

### July 18, 2025
- ✅ Successfully deployed to production domain newself.me and Replit domain newself.replit.app
- ✅ Configured Firebase authentication for production domains
- ✅ Changed default theme to light mode (normal mode) across all platforms and devices
- ✅ Added theme initialization script to prevent flash of wrong theme on page load
- ✅ Enhanced auth page with dramatic logo pulse animation and mobile-responsive layout
- ✅ Modified avatar click behavior throughout app: names now show/hide on click instead of hover
- ✅ Updated both desktop and mobile chat components with new toggle-on-click interaction
- ✅ Improved user experience by making name display persistent until clicked again
- ✅ Fixed avatar name tooltip visibility issues with high-contrast styling and proper z-index
- ✅ Enhanced tooltip positioning to appear directly above avatars with pointer arrows
- ✅ Applied black background with white text and borders for maximum visibility
- ✅ Implemented portal-based tooltip system using React createPortal to bypass container overflow constraints
- ✅ Fixed tooltip positioning to properly display above chat header area without clipping
- ✅ Reduced tooltip size by 50% with smaller text, padding, and arrow for better visual balance
- ✅ Fixed mobile avatar sizes to match chat avatars (w-8 h-8 on mobile, w-10 h-10 on desktop)
- ✅ Added dynamic screen positioning to prevent tooltips from disappearing off-screen
- ✅ Implemented click-anywhere-to-dismiss functionality with proper event handling
- ✅ Enhanced mood tracker with comprehensive overlay and analytics features:
  - Journey mode now displays as full-screen overlay with exit button and click-outside dismissal
  - Added calendar view for session history with clickable day details
  - Implemented week-based navigation with previous/next arrows for historical data
  - Created comprehensive search functionality for filtering by date or comment text
  - Added detailed session modal showing before/after mood states and improvements
  - Enhanced week filtering to show specific week ranges with proper navigation controls
  - Upgraded to full monthly calendar view with month/year navigation and proper date positioning
  - Fixed session duration display issues by improving data fetching and processing logic
  - Removed "Add Sample Data" button for non-admin users (admin-only feature)
  - Enhanced calendar day cards to show date numbers in top-left corner and session duration in center
  - Added before/after chakra color dots with arrow indicators for mood progression visualization
  - Implemented comprehensive escape key functionality for closing all overlays and modals
  - Fixed data loading sequence to prevent empty states on initial page visits
  - Added proper cache invalidation settings for real-time data updates
  - Improved month-to-month navigation with disabled future month restrictions
  - Enhanced calendar grid with 42-day display for complete monthly view including adjacent dates

### July 17, 2025
- ✅ Fixed message duplication by implementing proper WebSocket deduplication
- ✅ Fixed heart functionality - hearts now properly show grey by default and turn red when clicked
- ✅ Fixed like counter - now correctly displays and updates the like count
- ✅ Cleaned up debug logs for better performance
- ✅ Added beautiful waterfall background image to authentication page
- ✅ Enhanced auth page with dark overlay for better text readability
- ✅ Completed mood analytics page with comprehensive data visualization
- ✅ Fixed authentication issue in mood analytics by correcting API endpoint from `/api/user` to `/api/auth/user/{uid}`
- ✅ Resolved mood tracking submission bug by removing redundant firebaseUid parameter from request body
- ✅ Successfully implemented emotion-based mood tracking with 7-level chakra system
- ✅ Added session history display showing before/after mood levels and improvements
- ✅ Fixed React JSX warning in MoodTrackerIcon component by correcting style jsx attribute
- ✅ Resolved duplicate chakraColors declaration causing build errors and application crashes
- ✅ Fixed mood analytics date display to show "Today" for current session data
- ✅ Implemented proper timezone handling for both CST display and UTC storage
- ✅ Enhanced date formatting to handle both CST (2025-07-16) and UTC (2025-07-17) dates correctly
- ✅ Fixed cache invalidation to immediately refresh analytics data after mood entries
- ✅ Confirmed mood tracking system working perfectly with real-time analytics updates
- ✅ Added optional comment field to mood tracker for recording thoughts and feelings
- ✅ Enhanced mood tracker mobile responsiveness with dynamic screen adaptation
- ✅ Created meditation session tracking system with database schema and API endpoints
- ✅ Implemented real session duration tracking to replace placeholder data in analytics
- ✅ Added comprehensive session management with start/update/duration endpoints
- ✅ Prepared OpenAI service architecture for future AI-powered mood analysis integration
- ✅ Implemented time tracking on meditation page to monitor user engagement
- ✅ Added automatic session tracking with 30-second update intervals
- ✅ Integrated sendBeacon API for reliable session tracking even when user navigates away
- ✅ Fixed mobile layout issues in mood analytics with responsive controls and proper spacing
- ✅ Enhanced mood tracker interface with repositioned slider for better mobile usability
- ✅ Added session comments display in analytics showing user thoughts before/after meditation
- ✅ Repositioned mood tracker layout with chakra information and comment field stacked on right side
- ✅ Maintained slider and chakra visualization on left side for improved mobile layout
- ✅ Implemented custom profile picture system replacing emoji avatars with database-stored images
- ✅ Built comprehensive ProfilePictureManager component with full CRUD operations
- ✅ Added Profile Pictures tab to admin interface with upload, edit, delete functionality
- ✅ Enhanced system to support multiple file uploads simultaneously
- ✅ Updated profile picture selection to use original filenames automatically
- ✅ Modified settings page to fetch and display custom profile pictures from database instead of emoji avatars
- ✅ Fixed circular crop functionality to ensure perfect circles instead of ovals with proper canvas calculations
- ✅ Updated existing user profile to prevent forced profile setup, only new users required to complete setup
- ✅ Added dark mode toggle feature in settings with theme context and localStorage persistence
- ✅ Implemented comprehensive dark mode with improved color scheme and proper contrast
- ✅ Enhanced dark mode styling with better visual hierarchy and readability
- ✅ Researched and implemented dark mode best practices following WCAG 2024 guidelines
- ✅ Applied proper contrast ratios (4.5:1 for text, 3:1 for UI elements) for accessibility
- ✅ Updated navigation bar with theme-aware styling and improved contrast
- ✅ Enhanced live chat component with dark mode support and better message visibility
- ✅ Implemented elegant dark gray color scheme (#121212) instead of harsh black colors
- ✅ Added custom CSS variables for consistent dark mode theming across components
- ✅ Improved mobile navigation menu with proper dark mode hover states
- ✅ Fixed calendar schedule items with improved contrast and hover states for better readability
- ✅ Enhanced user management table with proper dark mode styling and border contrast
- ✅ Updated all admin dashboard components with comprehensive dark mode support
- ✅ Improved calendar navigation and schedule display with theme-aware colors
- ✅ Enhanced meditation page titles and descriptions with high contrast white text in dark mode
- ✅ Fixed meditation page statistics labels with better visibility (Active Now, Minutes, Level, Instructor)
- ✅ Improved admin template cards with bright white titles and readable text in dark mode
- ✅ Enhanced template duration and instructor labels with better contrast ratios
- ✅ Added bright green pulsing dot for online counter visibility in both navigation and chat
- ✅ Fixed mobile chat interface with proper dark mode styling and high contrast text
- ✅ Enhanced message text, usernames, and timestamps with bright white text in dark mode
- ✅ Improved chat input field with proper dark mode background and text contrast
- ✅ Fixed video player statistics area with bright white instructor names and improved contrast
- ✅ Enhanced video player metadata including duration, difficulty, and participant count visibility
- ✅ Reduced chat message spacing from space-y-3 to space-y-0 for zero gap between messages
- ✅ Eliminated message text bottom margin from mb-1 to mb-0 for ultra-compact messaging interface
- ✅ Applied same spacing improvements to desktop chat component for consistent experience
- ✅ Reduced desktop message container padding from p-3 to p-1 and chat area padding to p-2 for maximum compactness
- ✅ Minimized chat header padding on both mobile and desktop from p-4 to p-2 for compact layout
- ✅ Reduced avatar sizes in header from w-8 h-8 to w-6 h-6 for space efficiency
- ✅ Added horizontal scrolling for online user avatars with visual indicators when more than 3 users
- ✅ Moved online user avatars to a second line below chat header for better visibility
- ✅ Implemented click-to-show-name functionality for user avatars
- ✅ Enhanced mobile and desktop layouts with full-width avatar scrolling
- ✅ Adjusted scroll indicators to appear when more than 8 users on mobile and 10 on desktop
- ✅ Implemented gradient fade indicators showing scrollability for avatar overflow

### July 15, 2025
- ✅ Implemented admin page protection with authentication checks
- ✅ Enhanced video player with dual functionality (MP4 + YouTube support)
- ✅ Added clickable progress bar, fullscreen, and picture-in-picture controls
- ✅ Cleaned up interface by removing warning notices per user request
- ✅ Video player now works seamlessly with both direct video files and YouTube links
- ✅ Replaced default logo with custom PNG logo and doubled its size
- ✅ Removed Community tab from navigation and adjusted header height for larger logo
- ✅ Fixed admin navigation to only show for users with admin privileges
- ✅ Updated authentication page with custom logo and "Evolving Hearts" branding
- ✅ Doubled logo size to 160px x 160px on authentication page
- ✅ Added functional forgot password link with Firebase integration
- ✅ Improved forgot password UX: error clears when user clicks back into email field
- ✅ Removed top navigation bar from auth page for cleaner login experience
- ✅ Implemented complete user management system in admin panel
- ✅ Added user management tab with user listing, search, and role management
- ✅ Created backend API routes for user CRUD operations
- ✅ Added toggle admin status functionality for user management
- ✅ Updated dashboard to display user statistics
- ✅ Granted admin privileges to sebpessy@gmail.com user
- ✅ Implemented mobile UI improvements for navigation and chat
- ✅ Added auto-close mobile navigation menu when items are selected
- ✅ Enhanced chat to focus on latest messages with last 30 messages persistence
- ✅ Made chat header and input sticky on mobile for better usability
- ✅ Updated WebSocket to send initial messages when joining sessions
- ✅ Improved mobile meditation page layout with full-height chat
- ✅ Created comprehensive user settings page with profile management
- ✅ Added profile picture upload functionality with base64 storage
- ✅ Implemented user profile editing (name, email, profile picture)
- ✅ Updated database schema to include profile pictures
- ✅ Added settings navigation in both desktop dropdown and mobile menu
- ✅ Enhanced user avatar display with profile pictures in navigation
- ✅ Created backend API route for user profile updates
- ✅ Enhanced live chat with profile picture avatars replacing initial bubbles
- ✅ Added image cropping functionality with ReactCrop library for profile pictures
- ✅ Fixed server payload size limit to handle larger image uploads
- ✅ Updated chat message interface to include user profile pictures
- ✅ Modified database queries to include profile picture data in chat messages
- ✅ Fixed historical chat messages to show proper user profiles and avatars
- ✅ Updated WebSocket message broadcasting to include complete user profile data
- ✅ Resolved "Unknown" user display issue for existing chat messages
- ✅ Fixed Central Standard Time (CST) timezone handling for all date calculations
- ✅ Corrected date display in meditation page to show accurate "Tuesday, July 15, 2025"
- ✅ Added real-time countdown timer showing time remaining until next meditation (midnight CST)
- ✅ Implemented CST timezone-aware date formatting throughout the application
- ✅ Fixed Firebase Admin SDK configuration for complete user deletion
- ✅ Enhanced user deletion to remove from both PostgreSQL and Firebase Auth
- ✅ Resolved online user counting issues by tracking unique users instead of connections
- ✅ Fixed duplicate user counting when same user has multiple device connections
- ✅ Added online users display with profile picture avatars
- ✅ Implemented long-press/hover functionality to show user names on avatars
- ✅ Created mobile-friendly user interaction with touch events
- ✅ Added online users API endpoint for real-time user list retrieval
- ✅ Enhanced WebSocket messaging to include complete online user data
- ✅ Updated both desktop and mobile chat interfaces with online user avatars
- ✅ Moved online user avatars to the right side of chat header (mobile)
- ✅ Removed duplicate "Online:" text label for cleaner interface (mobile)
- ✅ Updated desktop chat layout to match mobile design consistency
- ✅ Aligned online user display across both desktop and mobile versions
- ✅ Implemented daily chat flush system for fresh conversations each day
- ✅ Added responsive user avatar display with flex-wrap for multiple lines
- ✅ Enhanced user positioning to add new users to the right of existing ones
- ✅ Created screen-adaptive layout that handles varying numbers of online users
- ✅ Added automatic chat message cleanup when new day begins
- ✅ Implemented template duplication feature in admin panel
- ✅ Added duplicate button with copy icon to template management interface
- ✅ Created API endpoint for duplicating meditation templates with "(Copy)" suffix
- ✅ Added schedule repeat functionality with configurable week intervals (1-12 weeks)
- ✅ Implemented repeat count option (1-4 times) for schedule repetition
- ✅ Enhanced schedule creation to automatically generate multiple schedules when repeat is enabled
- ✅ Updated database schema with repeatWeeks and repeatCount fields
- ✅ Added repeat options UI to schedule modal with preview information
- ✅ Implemented schedule sorting functionality with date and template options
- ✅ Added sorting controls to schedule management interface
- ✅ Enhanced schedule display to show sorted results in admin dashboard
- ✅ Implemented calendar view with week, month, and year options
- ✅ Added view mode toggle between list and calendar views
- ✅ Created interactive calendar navigation with previous/next controls
- ✅ Added clickable schedule items in calendar view for easy editing
- ✅ Enhanced calendar display with proper date formatting and schedule visualization

### July 14, 2025
- ✅ Fixed TypeScript compilation errors in storage layer
- ✅ Resolved React warnings about setting state during render
- ✅ Improved Firebase authentication error handling
- ✅ Fixed DOM nesting warnings in navigation component
- ✅ Configured Firebase secrets for authentication
- ✅ Application successfully running with authentication working

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for client-side navigation
- **Authentication**: Firebase Auth with React Firebase Hooks
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **WebSocket**: Native WebSocket server for real-time chat
- **Authentication**: Firebase Admin SDK integration

### Project Structure
```
/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and configs
│   │   └── hooks/       # Custom React hooks
├── server/          # Express backend
│   ├── index.ts     # Main server file
│   ├── routes.ts    # API routes and WebSocket
│   ├── storage.ts   # Database abstraction layer
│   └── vite.ts      # Vite integration
├── shared/          # Shared types and schemas
└── migrations/      # Database migrations
```

## Key Components

### Authentication System
- Firebase Authentication for user management
- Backend user registration and profile storage
- Admin role management through database flags
- Session management with secure cookies

### Database Schema
- **Users**: Email, name, Firebase UID, admin status
- **Meditation Templates**: Video content, session steps, instructor info
- **Schedules**: Daily meditation scheduling system
- **Chat Messages**: Real-time chat for meditation sessions

### Real-time Features
- WebSocket server for live chat during meditation sessions
- Online user counting and presence tracking
- Session-based chat rooms organized by date

### Admin Dashboard
- Template management (CRUD operations)
- Schedule management for daily meditations
- User management and analytics

## Data Flow

1. **User Authentication**: Firebase handles auth, backend stores user profiles
2. **Daily Meditation**: Schedule system determines today's meditation template
3. **Video Streaming**: Templates contain video URLs and structured session steps
4. **Live Chat**: WebSocket connections enable real-time communication
5. **Admin Operations**: CRUD operations for templates and schedules through REST API

## External Dependencies

### Frontend Dependencies
- React ecosystem (react, react-dom, react-router via wouter)
- UI library (shadcn/ui with Radix UI primitives)
- State management (@tanstack/react-query)
- Firebase (firebase, react-firebase-hooks)
- Styling (tailwindcss, clsx, class-variance-authority)

### Backend Dependencies
- Express.js with WebSocket support
- Drizzle ORM with PostgreSQL
- Neon Database serverless driver
- Firebase Admin SDK (implied for auth validation)

### Development Tools
- TypeScript for type safety
- Vite for build tooling
- ESBuild for server bundling
- PostCSS for CSS processing

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- Express server with auto-reload via tsx
- Database migrations via Drizzle Kit

### Production Build
- Frontend: Vite builds to `dist/public`
- Backend: ESBuild bundles server to `dist/index.js`
- Database: Schema migrations applied before deployment

### Environment Configuration
- Database URL required for Neon PostgreSQL connection
- Firebase configuration for authentication
- WebSocket support for real-time features

### Key Features
1. **Daily Meditation Sessions**: Scheduled content with video playback
2. **Real-time Chat**: Live interaction during meditation sessions
3. **User Management**: Authentication and profile handling
4. **Admin Dashboard**: Content and schedule management
5. **Responsive Design**: Mobile-friendly interface with TailwindCSS

The application uses a modern tech stack with strong typing, real-time capabilities, and a clean separation between frontend and backend concerns. The database design supports the core meditation scheduling functionality while enabling social features through chat and user management.