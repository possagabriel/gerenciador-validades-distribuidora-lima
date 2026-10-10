from django.contrib.auth import get_user_model
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .permissions import SomenteAdmin
from .serializers import UsuarioPerfilSerializer, UsuarioRegistroSerializer, UsuarioSerializer

Usuario = get_user_model()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    permission_classes = [SomenteAdmin]

    def get_serializer_class(self):
        if self.action == "me":
            return UsuarioPerfilSerializer
        if self.action == "create":
            return UsuarioRegistroSerializer
        return UsuarioSerializer

    def perform_destroy(self, instance):
        serializer = UsuarioSerializer(instance, data={"is_active": False}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        if request.method == "GET":
            return Response(self.get_serializer(request.user).data)
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
