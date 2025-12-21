# AI Coding Prompt: VolunteerHub Profile Page Implementation

## Project Context
I am developing "VolunteerHub", a web application for managing volunteer activities (tree planting, charity, education, etc.).
**Tech Stack:**
- **Frontend:** ViteJS + ReactJS + TypeScript
- **Styling:** TailwindCSS
- **UI Library:** Shadcn-UI
- **Icons:** lucide-react
- **Roles:** Volunteer, Event Manager, Admin

## Task Description
Please implement the **User Profile Page** UI for the route `/u/${user.username}`. This page should serve as the public identity for a user within the system.

## Requirements

### 1. Layout & Design
- **Consistency:** The page must follow the existing application layout (using the common `Navbar` and `Footer` components if applicable, or fitting within the main layout wrapper).
- **Responsive:** The design must be fully responsive.
- **Style:** Clean, modern, and accessible, utilizing the existing TailwindCSS theme and Shadcn-UI components.

### 2. Key Features & Sections
The profile should include the following sections:

#### A. Profile Header
- **User Info:** Display the user's `profilePicture` (Avatar), `name`, `username`, and `role` (display as a Badge).
- **Meta Info:** Show "Member since [Date]" (formatted).
- **Actions:**
  - **If viewing own profile:** Show an "Edit Profile" button (links to `/u/${username}/settings`).
  - **If viewing another user:** Show interaction buttons like "Add Friend" (or "Pending"/"Friends" status).

#### B. Content Tabs
Use a Tabbed interface (Shadcn `Tabs`) to organize content:
1.  **Overview/About:** Basic information (Email, Skills/Interests, Bio if available), User Stats (Charts).
2.  **Events:** A list or grid of events this user has participated in or organized. Reuse existing `EventCard` components if available.
3.  **Friends:** A list of the user's friends (similar to the `Friends` page UI).

### 3. Technical Constraints
- **Ignore Experimental Code:** Do **not** reference or use any code from `pages/test`. Create this as a production-ready feature.
- **Component Reuse:**
  - Use existing UI components from `@/components/ui` (Button, Avatar, Badge, Tabs, Card, Separator, etc.).
  - Reuse `EventCard` or similar components from `@/components/event` or `@/components/feed` to display activities.
- **Icons:** Use `lucide-react` for all icons (e.g., `MapPin`, `Calendar`, `User`, `Mail`, `Edit`).
- **Types:** Ensure strict TypeScript typing using the interfaces defined in `src/types/user.ts` and `src/types/event.ts`.

### 4. Data Handling (Mock/Skeleton)
- Since the backend integration might be complex, please set up the component to fetch data based on the `username` param.
- Create a dummy/mock data object or a placeholder `useUserProfile` hook if the actual service is not fully visible to you, so I can easily plug in the real API call later.

## Output
Please provide the full code for:
1.  `src/pages/Profile.tsx` (The main page component).
2.  Any necessary sub-components (e.g., `ProfileHeader.tsx`, `ProfileTabs.tsx`) if you decide to split it up for cleanliness.
