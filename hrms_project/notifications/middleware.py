from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    if not token:
        return AnonymousUser()
    try:
        validated = AccessToken(token)
        user_id = validated['user_id']
        return User.objects.select_related('employee').get(pk=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError, TypeError):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """Authenticate WebSocket connections via ?token=<JWT access token>."""

    async def __call__(self, scope, receive, send):
        if scope['type'] == 'websocket':
            query_string = scope.get('query_string', b'').decode()
            token = parse_qs(query_string).get('token', [None])[0]
            scope['user'] = await get_user_from_token(token)
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(inner)
