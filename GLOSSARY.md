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

**Discussion**:
The board attached to an event where users post and comment about it. Every event has exactly one, and it goes away with the event.
_Avoid_: Group, forum, channel

**Report**:
A user's complaint about a user, an event or a post, waiting for a moderator to resolve it (act on it) or reject it (dismiss it).
_Avoid_: Flag, complaint, ticket

**Notification**:
A message in a user's inbox telling them something happened that concerns them, usually caused by another user (the actor). A user is never notified of their own action.
_Avoid_: Alert, push

**Friend**:
A user connected to another user because both agreed to it. Friendship is symmetric: if A is B's friend, B is A's friend.
_Avoid_: Follower, connection

**Friend request**:
One user's invitation to another to become friends, waiting for the receiver to accept or reject it; the sender may cancel it meanwhile. Accepting makes them friends.
_Avoid_: Invite

**Friend suggestion**:
A user who is not yet your friend, proposed to you because of the friends you have in common.

**Cover image**:
The single picture that represents an event, shown both as its thumbnail in lists and as the banner on its page.
_Avoid_: Thumbnail, banner image, event image

**Profile picture**:
The single picture that represents a user, shown next to their name wherever they appear.
_Avoid_: Avatar
