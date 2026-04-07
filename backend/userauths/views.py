from django.shortcuts import render
# from django.http import JsonResponse
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
# from django.contrib.auth.tokens import default_token_generator
# from django.utils.http import urlsafe_base64_encode
# from django.utils.encoding import force_bytes
from django.core.exceptions import ObjectDoesNotExist

# Restframework
from rest_framework import status
# from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from userauths.serializer import MyTokenObtainPairSerializer, ProfileSerializer, RegisterSerializer,UserSerializer
from userauths.models import User, Profile
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework_simplejwt.tokens import RefreshToken

# Others
# import json
import random
import shortuuid





# This code defines a DRF View class called MyTokenObtainPairView, which inherits from TokenObtainPairView.
class MyTokenObtainPairView(TokenObtainPairView):
    # Here, it specifies the serializer class to be used with this view.
    serializer_class = MyTokenObtainPairSerializer


# This code defines another DRF View class called RegisterView, which inherits from generics.CreateAPIView.
class RegisterView(generics.CreateAPIView):
    # It sets the queryset for this view to retrieve all User objects.
    queryset = User.objects.all()
    # It specifies that the view allows any user (no authentication required).
    permission_classes = (AllowAny,)
    # It sets the serializer class to be used with this view.
    serializer_class = RegisterSerializer

# this function will generate an otp to verify the user
def generate_otp():
    uuid_key = shortuuid.uuid() #this line will generate a long string of characters
    unique_key = uuid_key[:6] #this line will only take six of those characters
    return unique_key #this will return those characters


# this function will send a password reset email verify for a user
class PasswordResetEmailVerify(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

    def get(self, request, *args, **kwargs):
        email = self.kwargs.get('email')

        try:
            user = User.objects.get(email=email)
        except ObjectDoesNotExist:
            # ✅ Return a clean 404 response if the email does not exist
            return Response(
                {"error": "User with this email does not exist."},
                status=status.HTTP_404_NOT_FOUND
            )

        # If user exists, continue sending the email
        user.otp = generate_otp()
        user.save()

        uidb64 = user.pk
        otp = user.otp
        link = f"http://localhost:5173/create-new-password?otp={otp}&uidb64={uidb64}"

        merge_data = {
            'link': link,
            'username': user.username,
        }

        subject = "Password Reset Request"
        text_body = render_to_string("email/password_reset.txt", merge_data)
        html_body = render_to_string("email/password_reset.html", merge_data)

        msg = EmailMultiAlternatives(
            subject=subject,
            from_email=settings.FROM_EMAIL,
            to=[user.email],
            body=text_body
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send()

        return Response(
            {"message": "Password reset email sent successfully."},
            status=status.HTTP_200_OK
        )



class PasswordChangeView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        otp = request.data.get("otp")
        uidb64 = request.data.get("uidb64")
        password = request.data.get("password")

        if not otp or not uidb64 or not password:
            return Response({"message": "Missing data"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = int(uidb64)
            user = User.objects.get(id=uid, otp=otp)
        except (ValueError, User.DoesNotExist):
            return Response({"message": "Invalid OTP or user"}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.otp = ""
        user.save()
        return Response({"message": "Password changed successfully"}, status=status.HTTP_200_OK)


# ===============this is where the customer logic starts==================
class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ProfileSerializer

    def get_object(self):
        user_id = self.kwargs['user_id']

        user = User.objects.get(id=user_id)
        profile = Profile.objects.get(user=user)
        return profile