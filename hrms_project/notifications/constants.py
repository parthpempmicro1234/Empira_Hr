class NotificationType:
    MENTION = 'mention'
    LEAVE_REQUESTED = 'leave_requested'
    LEAVE_APPROVED = 'leave_approved'
    LEAVE_REJECTED = 'leave_rejected'
    LEAVE_CANCELLED = 'leave_cancelled'
    LEAVE_NOTIFY = 'leave_notify'
    POST_COMMENT = 'post_comment'
    POST_REACTION = 'post_reaction'
    POLL_VOTE = 'poll_vote'
    ATTENDANCE_ALERT = 'attendance_alert'
    SYSTEM = 'system'

    REACTION_VERBS = {
        'like': 'liked',
        'heart': 'loved',
        'haha': 'reacted with Haha to',
        'clap': 'reacted with Clap to',
        'curious': 'reacted with Curious to',
    }

    CHOICES = (
        (MENTION, 'Mentioned in Post'),
        (LEAVE_REQUESTED, 'Leave Requested'),
        (LEAVE_APPROVED, 'Leave Approved'),
        (LEAVE_REJECTED, 'Leave Rejected'),
        (LEAVE_CANCELLED, 'Leave Cancelled'),
        (LEAVE_NOTIFY, 'Leave Notify'),
        (POST_COMMENT, 'Comment on Post'),
        (POST_REACTION, 'Reaction on Post'),
        (POLL_VOTE, 'Poll Vote'),
        (ATTENDANCE_ALERT, 'Attendance Alert'),
        (SYSTEM, 'System Announcement'),
    )
