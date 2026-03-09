from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    load_dotenv = None


def _load_backend_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    if load_dotenv is not None:
        load_dotenv(env_path)
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        normalized_value = value.strip()
        if (
            len(normalized_value) >= 2
            and normalized_value[0] == normalized_value[-1]
            and normalized_value[0] in {'"', "'"}
        ):
            normalized_value = normalized_value[1:-1]

        os.environ.setdefault(key.strip(), normalized_value)


_load_backend_env_file()


@dataclass(frozen=True)
class Settings:
    cors_allow_origins: tuple[str, ...]
    llm_enabled: bool
    llm_provider: str
    llm_model: str
    llm_api_key: str | None
    llm_base_url: str | None
    llm_timeout_seconds: int
    rag_top_k: int

    @property
    def llm_ready(self) -> bool:
        return self.llm_enabled and bool(self.llm_api_key)


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


def _get_list(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    value = os.getenv(name)
    if value is None:
        return default

    items = tuple(
        item.strip()
        for item in value.split(",")
        if item.strip()
    )
    return items or default


@lru_cache
def get_settings() -> Settings:
    return Settings(
        cors_allow_origins=_get_list(
            "CORS_ALLOW_ORIGINS",
            (
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ),
        ),
        llm_enabled=_get_bool("LLM_ENABLED", False),
        llm_provider=os.getenv("LLM_PROVIDER", "gemini").strip().lower(),
        llm_model=os.getenv("LLM_MODEL", "gemini-2.5-flash").strip(),
        llm_api_key=(
            os.getenv("GEMINI_API_KEY")
            or os.getenv("LLM_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        ),
        llm_base_url=(
            os.getenv("GEMINI_BASE_URL")
            or os.getenv("LLM_BASE_URL")
            or os.getenv("OPENAI_BASE_URL")
        ),
        llm_timeout_seconds=_get_int("LLM_TIMEOUT_SECONDS", 30),
        rag_top_k=_get_int("RAG_TOP_K", 5),
    )
