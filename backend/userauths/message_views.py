"""
In-app messaging system views.
Role-based permissions:
  - admin / ministry_admin: can message anyone
  - others: can only message users in same hospital or department, or administrators
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from userauths.models import User, Message
from userauths.serializer import (
    MessageSerializer, MessageCreateSerializer, MessageUserSerializer
)


def _can_message(sender, recipient):
    """Check if sender is allowed to message recipient."""
    if sender.id == recipient.id:
        return False
    sender_role = sender.role.name if sender.role else None
    recipient_role = recipient.role.name if recipient.role else None
    if sender_role in ('admin', 'ministry_admin'):
        return True
    if recipient_role in ('admin', 'ministry_admin'):
        return True
    if sender.hospital_id and sender.hospital_id == recipient.hospital_id:
        return True
    if sender.department_id and sender.department_id == recipient.department_id:
        return True
    return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inbox(request):
    """List received messages (not deleted by recipient)."""
    qs = Message.objects.filter(
        recipient=request.user,
        is_deleted_by_recipient=False,
    ).select_related('sender', 'recipient', 'sender__role', 'sender__hospital', 'recipient__role', 'recipient__hospital')
    return Response(MessageSerializer(qs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent(request):
    """List sent messages (not deleted by sender)."""
    qs = Message.objects.filter(
        sender=request.user,
        is_deleted_by_sender=False,
    ).select_related('sender', 'recipient', 'sender__role', 'sender__hospital', 'recipient__role', 'recipient__hospital')
    return Response(MessageSerializer(qs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Return count of unread messages for the current user."""
    count = Message.objects.filter(
        recipient=request.user, is_read=False, is_deleted_by_recipient=False
    ).count()
    return Response({'count': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def message_detail(request, message_id):
    """Retrieve a single message. Marks as read if recipient viewing."""
    msg = get_object_or_404(
        Message.objects.select_related('sender', 'recipient', 'sender__role', 'recipient__role'),
        id=message_id
    )
    # Allow only sender or recipient
    if request.user.id not in (msg.sender_id, msg.recipient_id):
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    # Mark as read when recipient opens
    if request.user.id == msg.recipient_id and not msg.is_read:
        msg.is_read = True
        msg.read_at = timezone.now()
        msg.save(update_fields=['is_read', 'read_at'])

    # Include thread (replies)
    data = MessageSerializer(msg).data
    thread = Message.objects.filter(Q(parent=msg) | Q(parent__parent=msg)).order_by('created_at')
    data['replies'] = MessageSerializer(thread, many=True).data
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a new message."""
    serializer = MessageCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    msg = serializer.save(sender=request.user)

    # Try to send SMS notification (silent failure)
    try:
        from userauths.sms_service import send_message_sms
        send_message_sms(msg)
    except Exception:
        pass

    return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    """Soft delete a message for the current user (sender or recipient)."""
    msg = get_object_or_404(Message, id=message_id)
    if request.user.id == msg.recipient_id:
        msg.is_deleted_by_recipient = True
    elif request.user.id == msg.sender_id:
        msg.is_deleted_by_sender = True
    else:
        return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    msg.save(update_fields=['is_deleted_by_recipient', 'is_deleted_by_sender'])
    return Response({'detail': 'Deleted.'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read(request, message_id):
    """Manually mark a message as read."""
    msg = get_object_or_404(Message, id=message_id, recipient=request.user)
    msg.mark_as_read()
    return Response({'detail': 'Marked as read.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversations(request):
    """
    List unique conversation partners with latest message + unread count.
    Used for the Live Chat conversations sidebar.
    """
    me = request.user
    # All messages involving me
    msgs = Message.objects.filter(
        Q(sender=me, is_deleted_by_sender=False) |
        Q(recipient=me, is_deleted_by_recipient=False)
    ).select_related('sender', 'recipient', 'sender__role', 'recipient__role').order_by('-created_at')

    # Group by conversation partner
    conv_map = {}
    for m in msgs:
        partner = m.recipient if m.sender_id == me.id else m.sender
        if partner.id in conv_map:
            continue  # we already have the latest message for this partner
        # Count unread (messages from partner to me that are unread)
        unread = Message.objects.filter(
            sender=partner, recipient=me, is_read=False, is_deleted_by_recipient=False
        ).count()
        conv_map[partner.id] = {
            'partner': MessageUserSerializer(partner).data,
            'last_message': {
                'id': m.id,
                'body': m.body,
                'subject': m.subject,
                'is_read': m.is_read,
                'created_at': m.created_at,
                'from_me': m.sender_id == me.id,
            },
            'unread_count': unread,
        }

    # Convert dict to ordered list (already in chronological order since msgs is sorted)
    return Response(list(conv_map.values()))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_detail(request, user_id):
    """
    Get all messages between current user and another user (chronological).
    Marks all messages from the other user as read.
    """
    me = request.user
    other = get_object_or_404(User, id=user_id)

    # Check permission
    if not _can_message(me, other) and not _can_message(other, me):
        return Response({'detail': 'Not authorized to view this conversation.'}, status=status.HTTP_403_FORBIDDEN)

    # Fetch all messages between the two users
    qs = Message.objects.filter(
        (Q(sender=me, recipient=other) & Q(is_deleted_by_sender=False)) |
        (Q(sender=other, recipient=me) & Q(is_deleted_by_recipient=False))
    ).select_related('sender', 'recipient', 'sender__role', 'recipient__role').order_by('created_at')

    # Mark received messages as read
    Message.objects.filter(
        sender=other, recipient=me, is_read=False
    ).update(is_read=True, read_at=timezone.now())

    return Response({
        'partner': MessageUserSerializer(other).data,
        'messages': MessageSerializer(qs, many=True, context={'request': request}).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def send_chat_message(request):
    """
    Send a chat message. Supports text, image, video, or audio/voice note attachments.
    Accepts multipart/form-data when uploading files, or JSON for text only.
    """
    recipient_id = request.data.get('recipient')
    body = (request.data.get('body') or '').strip()
    attachment = request.FILES.get('attachment')
    attachment_type = request.data.get('attachment_type')  # 'image' | 'video' | 'audio' | 'file'
    attachment_duration = request.data.get('attachment_duration')  # optional, for audio/video

    if not recipient_id:
        return Response({'detail': 'Recipient is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not body and not attachment:
        return Response({'detail': 'Either a message body or an attachment is required.'}, status=status.HTTP_400_BAD_REQUEST)

    recipient = get_object_or_404(User, id=recipient_id)
    if not _can_message(request.user, recipient):
        return Response({'detail': 'You are not allowed to message this user.'}, status=status.HTTP_403_FORBIDDEN)

    # File size limit: 20 MB
    if attachment and attachment.size > 20 * 1024 * 1024:
        return Response({'detail': 'Attachment too large (max 20 MB).'}, status=status.HTTP_400_BAD_REQUEST)

    # Infer attachment type from content_type if not provided
    if attachment and not attachment_type:
        ct = (attachment.content_type or '').lower()
        if ct.startswith('image/'):
            attachment_type = 'image'
        elif ct.startswith('video/'):
            attachment_type = 'video'
        elif ct.startswith('audio/'):
            attachment_type = 'audio'
        else:
            attachment_type = 'file'

    msg_kwargs = {
        'sender': request.user,
        'recipient': recipient,
        'subject': 'Chat',
        'body': body,
    }
    if attachment:
        msg_kwargs['attachment'] = attachment
        msg_kwargs['attachment_type'] = attachment_type
        msg_kwargs['attachment_name'] = attachment.name
        try:
            if attachment_duration:
                msg_kwargs['attachment_duration'] = float(attachment_duration)
        except (ValueError, TypeError):
            pass

    msg = Message.objects.create(**msg_kwargs)

    # Try to send SMS notification if enabled (silent failure)
    try:
        from userauths.sms_service import send_message_sms
        send_message_sms(msg)
    except Exception:
        pass

    return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recipients(request):
    """
    List users the current user is allowed to message.
    Supports ?search=... query param.
    """
    search = request.query_params.get('search', '').strip()
    qs = User.objects.exclude(id=request.user.id).select_related('role', 'hospital')

    sender_role = request.user.role.name if request.user.role else None
    if sender_role not in ('admin', 'ministry_admin'):
        # Restricted: same hospital/department + administrators
        qs = qs.filter(
            Q(hospital_id=request.user.hospital_id, hospital_id__isnull=False) |
            Q(department_id=request.user.department_id, department_id__isnull=False) |
            Q(role__name__in=['admin', 'ministry_admin'])
        )

    if search:
        qs = qs.filter(
            Q(full_name__icontains=search) |
            Q(email__icontains=search) |
            Q(role__name__icontains=search)
        )

    qs = qs.filter(is_active=True).distinct().order_by('full_name')[:50]
    return Response(MessageUserSerializer(qs, many=True).data)
