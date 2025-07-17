# Replit.md - Serene Space Meditation Application

## Overview

This is a full-stack meditation application built with React frontend and Express backend. The application provides daily meditation sessions with live chat functionality, user authentication through Firebase, and admin capabilities for managing meditation templates and schedules.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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