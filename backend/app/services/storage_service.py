import os
import uuid
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Tuple, BinaryIO
from backend.app.core.config import settings
from backend.app.core.exceptions import InvalidFileTypeError, PayloadTooLargeError

class StorageProvider(ABC):
    @abstractmethod
    def save(self, file_content: bytes, original_filename: str, mime_type: str) -> Tuple[str, str, int]:
        """Save file bytes and return (stored_filename, checksum, file_size)"""
        pass

    @abstractmethod
    def get_path(self, stored_filename: str) -> Path:
        """Resolve the internal file path (never expose to HTTP clients directly)"""
        pass

    @abstractmethod
    def delete(self, stored_filename: str) -> bool:
        """Delete file from storage"""
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: Path = settings.STORAGE_DIR):
        self.base_dir = base_dir.resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, file_content: bytes, original_filename: str, mime_type: str):
        # 1. Size check
        size = len(file_content)
        if size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise PayloadTooLargeError(
                f"File size {size / (1024 * 1024):.2f}MB exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        # 2. Extension check
        ext = Path(original_filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise InvalidFileTypeError(f"File extension '{ext}' is not permitted.")

        # 3. MIME type check
        if mime_type not in settings.ALLOWED_MIME_TYPES:
            raise InvalidFileTypeError(f"MIME type '{mime_type}' is not permitted.")

        # 4. Magic bytes signature validation
        expected_signatures = settings.ALLOWED_MIME_TYPES[mime_type]
        if expected_signatures:
            matches_signature = any(file_content.startswith(sig) for sig in expected_signatures)
            if not matches_signature:
                raise InvalidFileTypeError(
                    f"File signature mismatch. The file content does not match the declared MIME type {mime_type}."
                )

    def save(self, file_content: bytes, original_filename: str, mime_type: str) -> Tuple[str, str, int]:
        self.validate_file(file_content, original_filename, mime_type)

        ext = Path(original_filename).suffix.lower()
        # Secure random stored filename preventing collisions and path traversal
        stored_filename = f"{uuid.uuid4().hex}{ext}"
        target_path = (self.base_dir / stored_filename).resolve()

        # Path traversal guard
        if not str(target_path).startswith(str(self.base_dir)):
            raise InvalidFileTypeError("Path traversal attempt detected.")

        with open(target_path, "wb") as f:
            f.write(file_content)

        # SHA-256 Checksum calculation
        checksum = hashlib.sha256(file_content).hexdigest()
        file_size = len(file_content)

        return stored_filename, checksum, file_size

    def get_path(self, stored_filename: str) -> Path:
        # Sanitize against path traversal
        safe_name = Path(stored_filename).name
        target_path = (self.base_dir / safe_name).resolve()
        if not str(target_path).startswith(str(self.base_dir)):
            raise InvalidFileTypeError("Invalid storage file path access.")
        return target_path

    def delete(self, stored_filename: str) -> bool:
        try:
            path = self.get_path(stored_filename)
            if path.exists() and path.is_file():
                path.unlink()
                return True
        except Exception:
            pass
        return False

storage_service = LocalStorageProvider()
