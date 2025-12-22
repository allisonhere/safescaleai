from pathlib import Path
from uuid import uuid4


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_policy_file(storage_dir: Path, filename: str, content: bytes) -> Path:
    ensure_dir(storage_dir)
    safe_name = Path(filename).name if filename else "policy.pdf"
    extension = Path(safe_name).suffix or ".pdf"
    target = storage_dir / f"{uuid4().hex}{extension}"
    target.write_bytes(content)
    return target
