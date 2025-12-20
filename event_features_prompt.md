# Feature Request: Event Reporting & Management Enhancements

## Project Context
- **Stack:** ViteJS, ReactJS, TailwindCSS, TypeScript, Shadcn-UI.
- **Domain:** Volunteer Activity Management (Charity, Cleanups, etc.).
- **Roles:** Volunteer, Event Manager, Admin.
- **Icon Library:** `lucide-react`.

## Objectives

### 1. Volunteer Feature: Report Event
**Location:** `Event Card` (Volunteer View)
**Task:**
- Add a **Flag icon** (using `lucide-react`) to the Event Card.
- **Interaction:** Clicking the icon opens a **Report Dialog**.
- **UI Requirements:**
  - Reuse the structure of the existing "Report Post" dialog.
  - Update the **Header** and content to be contextually appropriate for reporting an **Event**.

### 2. Manager Feature: View Reports
**Location:** `src/components/event/manager-event-card.tsx`
**Task:**
- Add a **"View Reports"** item to the existing Dropdown Menu.
- **Interaction:** Clicking this item opens a **Reports Management Dialog**.
- **UI Requirements:**
  - The dialog should mimic the layout of `src/pages/admin/ReportsManagement.tsx`.
  - **Components:**
    - Header
    - Search Bar
    - Status Filter (Pending, Resolved, Rejected)
    - **Data Table** with the following columns:
      1. **Reporter:** Display User Avatar and Name.
      2. **Post ID:** Clickable link.
         - *Behavior:* Redirects to `/events/<event-id>/posts/<post-id>` to view the reported post.
      3. **Reason:** The reason for the report.
      4. **Status:** Badge indicating Reject, Resolved, or Pending.
      5. **Action:**
         - If Status is **Pending**: Display **X icon** (Reject) and **Check icon** (Resolve).
         - Handle state updates accordingly.

## Important Constraints
- **Experimental Code:** Ignore any code located in `pages/test`. Do not use it as a reference.
- **Design System:** Strictly adhere to the existing application layout and Shadcn-UI components.
- **Icons:** Use `lucide-react` for all icons.
- **Clean Code:** Ensure the implementation is modular and fully typed with TypeScript.
