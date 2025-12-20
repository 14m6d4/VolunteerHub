# Admin Dashboard Implementation Prompt

**Role:** Senior Frontend Developer
**Project Context:** "VolunteerHub" - A web application for organizing and managing volunteer activities (tree planting, charity, education, etc.).
**Tech Stack:** ViteJS + ReactJS + TailwindCSS + TypeScript + Shadcn-UI.
**Icons:** `lucide-react`

## Task Overview
Create a comprehensive "Admin Dashboard" accessible at the route `/manage`. The dashboard should feature a persistent Left Sidebar layout with the following navigation tabs: **Users**, **Events**, **Reports**, and **Analytics**.

Please ignore any existing code in `pages/test` and implement the UI from scratch to ensure a clean, production-ready structure.

---

## Detailed Requirements

### 1. Layout & Navigation
- **Route:** `/manage` (Parent layout).
- **Sidebar:**
  - **Users:** Icon (User) + Label "Users" -> Links to `/manage/users`.
  - **Events:** Icon (Calendar/Event) + Label "Events" -> Links to `/manage/events`.
  - **Reports:** Icon (Flag) + Label "Reports" -> Links to `/manage/reports`.
  - **Analytics:** Icon (BarChart/Analytics) + Label "Analytics" -> Links to `/manage/analytics`.

### 2. Users Management Tab (`/manage/users`)
**Header Section:**
- Title: "User list"
- Description: "Manage your users and their roles here."
- **Actions (Top Right):**
  - **"Export to CSV/JSON" Button:** Opens a Dialog allowing the user to select format (CSV or JSON) and click "Download".
  - **"Add User" Button:** Opens a Dialog with a form.
    - Fields: Full Name, Username, Email, Role (Select: Volunteer or Manager), Password, Confirm Password.
    - Action: "Save changes" adds the user to the table (mock logic).

**Data Table:**
- **Columns:** Checkbox (select row), Full Name, Username, Email, Status (Active/Banned), Role (Volunteer/Manager), Actions (Horizontal Three-dot dropdown).
- **Row Actions (Dropdown):**
  - **Edit:** Opens the "Add User" dialog pre-filled with data.
  - **Ban:** Changes status to "Banned" (Require Confirmation Dialog).
  - **Delete:** Removes row (Require Confirmation Dialog).
- **Table Features:**
  - **Sorting:** Ascending/Descending for Username, Full Name, Email.
  - **Filtering:** Search bar (by Full Name), Status Filter, Role Filter.
  - **Bulk Actions:** Checkboxes to select multiple rows for Bulk Ban/Delete.
  - **Pagination:** Configurable "Rows per page".

### 3. Events Management Tab (`/manage/events`)
**Header Section:**
- Title: "Event Management"
- **Actions:** "Export to CSV/JSON" Button.

**Data Table:**
- **Columns:** Checkbox, Event Name, Event Detail (truncate if long), Date, Location, Members (count), Tags (Badges), Status (Active, Completed, Pending), Action.
- **Action Column Logic:**
  - If Status is **Active/Completed**: Show **X icon** (Delete).
  - If Status is **Pending**: Show **Reject (X icon)** and **Approve (Check icon)**.
    - *Reject:* Deletes the event.
    - *Approve:* Changes status to Active.
- **Table Features:**
  - **Sorting:** Event Name, Date, Members.
  - **Filtering:** Search bar (Event Name), Status Filter.
  - **Bulk Actions:** Bulk Delete via checkboxes.
  - **Pagination:** Same as Users tab.

### 4. Reports Management Tab (`/manage/reports`)
- **Goal:** Refactor/Update the existing `Reports.tsx` to match the design consistency of the Users and Events tabs.
- **Specific UI Changes:**
  - Add an **"ID" column** immediately after "Target type".
    - Logic: If Type is `Post`, show `post-id`. If Type is `User`, show `username`.
  - **Actions:**
    - Replace "Reject" text with **X icon**.
    - Replace "Resolve" text with **Check icon**.
  - **Pagination:** Same as Users tab.

### 5. Analytics Tab (`/manage/analytics`)
- **Goal:** Create a visually appealing dashboard with charts and statistics.
- **Creative Freedom:** Use your judgment to design beautiful, interactive charts (e.g., using `recharts` or similar compatible with React).
- **Suggested Metrics:** User growth, Events per month, Active vs. Completed events, Reports distribution, etc.

---

## Implementation Notes
1.  **Mock Data:** Since the backend might not be fully ready for these specific filters, please create realistic **mock data** within the components or a separate `data.ts` file to demonstrate all functionality (sorting, filtering, pagination).
2.  **Components:** Use **Shadcn-UI** components (Table, Dialog, DropdownMenu, Button, Input, Select, Badge, Card, etc.).
3.  **Confirmation:** Ensure all destructive actions (Delete, Ban, Reject) trigger a confirmation dialog/alert before execution.
4.  **Responsiveness:** Ensure the layout works well on desktop and tablet sizes.
