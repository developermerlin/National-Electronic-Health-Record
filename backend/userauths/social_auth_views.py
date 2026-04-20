import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from userauths.serializer import MyTokenObtainPairSerializer
from userauths.models import Profile, Role

User = get_user_model()


def get_or_create_social_user(email, full_name, provider):
    """Get existing user or create a new one from social auth data."""
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Create new user with a patient role by default
        patient_role = Role.objects.filter(name='patient').first()
        user = User.objects.create(
            email=email,
            full_name=full_name or email.split('@')[0],
            phone='',
            is_active=True,
            role=patient_role,
        )
        user.set_unusable_password()
        user.save()
        # Profile is auto-created via post_save signal, but ensure it exists
        Profile.objects.get_or_create(user=user, defaults={'full_name': full_name})

    return user


def generate_jwt_for_user(user):
    """Generate JWT tokens (access + refresh) for a given user, using our custom serializer."""
    token = MyTokenObtainPairSerializer.get_token(user)
    return {
        'access': str(token.access_token),
        'refresh': str(token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Accepts a Google OAuth access_token from the frontend,
    verifies it with Google, and returns JWT tokens.
    """
    access_token = request.data.get('access_token')
    if not access_token:
        return Response({'error': 'access_token is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify the token with Google
    try:
        google_resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if google_resp.status_code != 200:
            return Response({'error': 'Invalid Google token'}, status=status.HTTP_401_UNAUTHORIZED)

        google_data = google_resp.json()
        email = google_data.get('email')
        name = google_data.get('name', '')

        if not email:
            return Response({'error': 'Could not retrieve email from Google'}, status=status.HTTP_400_BAD_REQUEST)

    except requests.RequestException:
        return Response({'error': 'Failed to verify Google token'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    user = get_or_create_social_user(email, name, 'google')
    if not user.is_active:
        return Response({'error': 'Your account is not yet activated. Please contact your administrator.'}, status=status.HTTP_403_FORBIDDEN)

    tokens = generate_jwt_for_user(user)
    return Response(tokens, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def facebook_login(request):
    """
    Accepts a Facebook OAuth access_token from the frontend,
    verifies it with Facebook, and returns JWT tokens.
    """
    access_token = request.data.get('access_token')
    if not access_token:
        return Response({'error': 'access_token is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify the token with Facebook
    try:
        fb_resp = requests.get(
            'https://graph.facebook.com/me',
            params={'fields': 'id,name,email', 'access_token': access_token},
            timeout=10,
        )
        if fb_resp.status_code != 200:
            return Response({'error': 'Invalid Facebook token'}, status=status.HTTP_401_UNAUTHORIZED)

        fb_data = fb_resp.json()
        email = fb_data.get('email')
        name = fb_data.get('name', '')

        if not email:
            return Response(
                {'error': 'Could not retrieve email from Facebook. Make sure email permission is granted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except requests.RequestException:
        return Response({'error': 'Failed to verify Facebook token'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    user = get_or_create_social_user(email, name, 'facebook')
    if not user.is_active:
        return Response({'error': 'Your account is not yet activated. Please contact your administrator.'}, status=status.HTTP_403_FORBIDDEN)

    tokens = generate_jwt_for_user(user)
    return Response(tokens, status=status.HTTP_200_OK)
