from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets

from .serializers import UsuarioRegistroSerializer, UsuarioSerializer

Usuario = get_user_model()


class UsuarioViewSet(viewsets.ModelViewSet):

    queryset = Usuario.objects.all()

    def get_serializer_class(self):
        if self.action == "create":
            return UsuarioRegistroSerializer
        return UsuarioSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]