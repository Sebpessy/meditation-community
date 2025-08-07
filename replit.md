# Serene Space Meditation Application

## Overview
This is a full-stack meditation application designed to provide daily meditation sessions. It features live chat, user authentication, and administrative tools for managing meditation content and schedules. The project aims to create an engaging platform for spiritual growth and well-being, fostering a sense of community among users. It incorporates a comprehensive referral system to drive user acquisition and engagement through a unique reward mechanism.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI/UX**: TailwindCSS and shadcn/ui components for a clean, responsive design. The application defaults to light mode but offers a comprehensive dark mode with WCAG 2024 accessibility guidelines (4.5:1 text contrast, 3:1 UI element contrast) and an elegant dark gray color scheme. Avatar interactions are click-based for name display.
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Authentication**: Firebase Auth with React Firebase Hooks
- **Build Tool**: Vite
- **Key Features**:
    - Dual video player (MP4 + YouTube) with controls.
    - Comprehensive mood tracking with 7-level chakra system, session history, and analytics. Includes optional comments and before/after mood visualization.
    - Custom profile picture system with upload, cropping, and display.
    - Comprehensive referral system with unique codes, point tracking, automatic completion based on meditation duration, and proper validation APIs.
    - Responsive design for mobile and desktop, including compact chat interfaces and adaptive avatar displays.

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM, hosted on Neon Database.
- **WebSocket**: Native WebSocket server for real-time communication.
- **Authentication**: Firebase Admin SDK for user validation and management.
- **Key Features**:
    - Robust user management with admin roles, profile updates, and secure user deletion.
    - Real-time chat with daily flushing, message persistence, and online user presence tracking.
    - Meditation session tracking with accurate duration monitoring.
    - API endpoints for referral system (validation, generation, completion), user profiles, and meditation data.
    - Central Standard Time (CST) timezone handling for all date calculations and scheduling.

### Project Structure
- `/client/`: React frontend (components, pages, lib, hooks)
- `/server/`: Express backend (index, routes, storage, vite)
- `/shared/`: Shared types and schemas
- `/migrations/`: Database migrations

### Core System Design
- **Authentication**: Firebase handles front-end authentication, while Firebase Admin SDK validates tokens on the backend. User profiles and roles are stored in PostgreSQL.
- **Data Flow**: Users authenticate via Firebase. Scheduled meditation templates (video URLs, steps) are served from the backend. Real-time features like chat and online presence are managed via WebSockets. Admin operations (template/schedule CRUD) are exposed via REST APIs.
- **Real-time Communication**: A native WebSocket server powers the live chat and online user presence tracking during meditation sessions, ensuring a dynamic and interactive user experience.
- **Admin Capabilities**: A dedicated admin dashboard allows for comprehensive management of meditation templates, schedules, and user accounts, including advanced features like template duplication and schedule repetition. A "Gardian Angel" role provides moderation capabilities for the chat and oversight of scheduled meditations.

## External Dependencies

### Frontend
- React, react-dom, wouter
- shadcn/ui, Radix UI primitives, TailwindCSS, clsx, class-variance-authority
- @tanstack/react-query
- Firebase, react-firebase-hooks
- ReactCrop (for image cropping)

### Backend
- Express.js
- Drizzle ORM, @neondatabase/serverless
- Firebase Admin SDK
- WebSocket (native)

### Development Tools
- TypeScript
- Vite
- ESBuild
- PostCSS