# VolunteerHub

A platform where managers publish volunteer events and volunteers sign up for them.

## Language

**Manager**:
A user whose role lets them publish events.
_Avoid_: Organizer

**Event manager**:
The manager who published a given event. Having the manager role gives no rights over another manager's events.
_Avoid_: Owner, host

**Moderator**:
For a given event, its event manager or any admin. A post or comment is moderated by the moderators of the event it belongs to; content outside any event is moderated by admins only.
_Avoid_: Mod, reviewer

**Report**:
A user's complaint about a user, an event or a post, waiting for a moderator to resolve it (act on it) or reject it (dismiss it).
_Avoid_: Flag, complaint, ticket

**Notification**:
A message in a user's inbox telling them something happened that concerns them, usually caused by another user (the actor). A user is never notified of their own action.
_Avoid_: Alert, push

**Cover image**:
The single picture that represents an event, shown both as its thumbnail in lists and as the banner on its page.
_Avoid_: Thumbnail, banner image, event image

**Profile picture**:
The single picture that represents a user, shown next to their name wherever they appear.
_Avoid_: Avatar
