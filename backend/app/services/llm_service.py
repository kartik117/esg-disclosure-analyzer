from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import logging
from typing import Literal

import httpx

from app.config import Settings, get_settings


logger = logging.getLogger(__name__)


Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class LLMMessage:
    role: Role
    content: str


class LLMServiceError(RuntimeError):
    pass


class LLMConfigurationError(LLMServiceError):
    pass


class LLMProviderError(LLMServiceError):
    pass


class LLMResponseError(LLMServiceError):
    pass


class LLMService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def generate(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        messages: list[LLMMessage] = []

        if system_prompt:
            messages.append(LLMMessage(role="system", content=system_prompt))

        messages.append(LLMMessage(role="user", content=prompt))

        return self.chat(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def chat(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        self._validate_configuration()

        provider = self.settings.llm_provider
        if provider == "gemini":
            payload = self._build_gemini_payload(
                messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            response_json = self._post_gemini_generate_content(payload)
            return self._extract_gemini_text(response_json)

        if provider not in {"openai", "openai_compatible"}:
            raise LLMConfigurationError(
                f"Unsupported LLM provider: {provider}"
            )

        payload = {
            "model": self.settings.llm_model,
            "messages": [
                {"role": message.role, "content": message.content}
                for message in messages
            ],
            "temperature": temperature,
        }

        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        response_json = self._post_chat_completions(payload)
        return self._extract_text(response_json)

    def _validate_configuration(self) -> None:
        if not self.settings.llm_enabled:
            raise LLMConfigurationError(
                "LLM support is disabled. Set LLM_ENABLED=true to enable it."
            )

        if not self.settings.llm_api_key:
            missing_key_name = (
                "GEMINI_API_KEY"
                if self.settings.llm_provider == "gemini"
                else "OPENAI_API_KEY"
            )
            logger.error("LLM not configured. Please set %s.", missing_key_name)
            raise LLMConfigurationError(
                f"LLM not configured. Please set {missing_key_name}."
            )

        if not self.settings.llm_model:
            raise LLMConfigurationError(
                "LLM_MODEL is not configured."
            )

    def _build_gemini_payload(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float,
        max_tokens: int | None,
    ) -> dict:
        system_parts: list[dict[str, str]] = []
        contents: list[dict] = []

        for message in messages:
            if message.role == "system":
                system_parts.append({"text": message.content})
                continue

            role = "user" if message.role == "user" else "model"
            contents.append(
                {
                    "role": role,
                    "parts": [{"text": message.content}],
                }
            )

        payload: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
            },
        }

        if system_parts:
            payload["system_instruction"] = {"parts": system_parts}

        if max_tokens is not None:
            payload["generationConfig"]["maxOutputTokens"] = max_tokens

        return payload

    def _post_gemini_generate_content(self, payload: dict) -> dict:
        base_url = (
            self.settings.llm_base_url.rstrip("/")
            if self.settings.llm_base_url
            else "https://generativelanguage.googleapis.com/v1beta"
        )
        url = f"{base_url}/models/{self.settings.llm_model}:generateContent"

        headers = {
            "x-goog-api-key": self.settings.llm_api_key,
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.settings.llm_timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip()
            raise LLMProviderError(
                f"Gemini API request failed with status {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise LLMProviderError(
                f"Gemini API request failed: {exc}"
            ) from exc
        except ValueError as exc:
            raise LLMResponseError(
                "Gemini API returned invalid JSON."
            ) from exc

    def _post_chat_completions(self, payload: dict) -> dict:
        base_url = (
            self.settings.llm_base_url.rstrip("/")
            if self.settings.llm_base_url
            else "https://api.openai.com/v1"
        )
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.settings.llm_timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text.strip()
            raise LLMProviderError(
                f"LLM provider request failed with status {exc.response.status_code}: {detail}"
            ) from exc
        except httpx.HTTPError as exc:
            raise LLMProviderError(
                f"LLM provider request failed: {exc}"
            ) from exc
        except ValueError as exc:
            raise LLMResponseError(
                "LLM provider returned invalid JSON."
            ) from exc

    def _extract_text(self, response_json: dict) -> str:
        try:
            choices = response_json["choices"]
            message = choices[0]["message"]
            content = message["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMResponseError(
                "LLM provider response did not contain a valid message."
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise LLMResponseError(
                "LLM provider returned an empty response."
            )

        return content.strip()

    def _extract_gemini_text(self, response_json: dict) -> str:
        try:
            candidates = response_json["candidates"]
            parts = candidates[0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMResponseError(
                "Gemini API response did not contain valid content."
            ) from exc

        texts = [
            part["text"].strip()
            for part in parts
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        ]

        if not texts:
            raise LLMResponseError(
                "Gemini API returned an empty response."
            )

        return "\n".join(texts).strip()


@lru_cache
def get_llm_service() -> LLMService:
    return LLMService(get_settings())
