from rest_framework.response import Response
from rest_framework import status

class DeleteMessageMixin:
    delete_message = "Deleted successfully"

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)

        return Response(
            {"message": self.delete_message},
            status=status.HTTP_200_OK
        )