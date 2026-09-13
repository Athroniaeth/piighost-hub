import msgspec
from litestar import Request, Response
from litestar.status_codes import HTTP_404_NOT_FOUND, HTTP_500_INTERNAL_SERVER_ERROR


class AppError(Exception):
    """Base for domain errors. Subclass per failure, set status_code + detail.

    A message passed at raise time replaces the class default, so a handler can
    say which object was not found rather than only that something was.
    """

    status_code: int = HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = "Internal Server Error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppError):
    status_code = HTTP_404_NOT_FOUND
    detail = "Resource not found"


class ProblemDetail(msgspec.Struct):
    """RFC 9457 problem detail body."""

    status: int
    detail: str
    type: str = "about:blank"


def app_error_handler(request: Request, exc: AppError) -> Response[ProblemDetail]:
    """Map any AppError subclass to a problem+json response."""
    content = ProblemDetail(
        detail=exc.detail,
        status=exc.status_code,
        type=exc.__class__.__name__,
    )
    return Response(
        content=content,
        status_code=exc.status_code,
        media_type="application/problem+json",
    )
