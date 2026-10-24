from fastapi import HTTPException, status

class TrustVaultException(HTTPException):
    def __init__(self, status_code: int, detail: str, error_code: str = "ERROR"):
        super().__init__(status_code=status_code, detail={"message": detail, "code": error_code})

class AuthenticationError(TrustVaultException):
    def __init__(self, detail: str = "Authentication required or invalid session."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHENTICATED"
        )

class ForbiddenError(TrustVaultException):
    def __init__(self, detail: str = "Access denied: insufficient permissions."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="ACCESS_DENIED"
        )

class NotFoundError(TrustVaultException):
    def __init__(self, detail: str = "Requested resource not found."):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND"
        )

class ConflictError(TrustVaultException):
    def __init__(self, detail: str = "Resource conflict."):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT"
        )

class PayloadTooLargeError(TrustVaultException):
    def __init__(self, detail: str = "Uploaded file exceeds maximum permitted size."):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=detail,
            error_code="PAYLOAD_TOO_LARGE"
        )

class InvalidFileTypeError(TrustVaultException):
    def __init__(self, detail: str = "Uploaded file type or signature is not supported."):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="INVALID_FILE_TYPE"
        )
