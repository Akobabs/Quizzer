from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    ENVIRONMENT: Literal["development", "production", "test"] = "development"

    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"
    LOG_ROTATION: str = "500 MB"
    LOG_RETENTION: str = "10 days"
    LOG_COMPRESSION: str = "gz"

    # API keys — only the key matching MODEL_PROVIDER is required at runtime
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1-mini"

    MODEL_PROVIDER: Literal["google", "groq", "openai"] = "openai"

    LANGSMITH_API_KEY: str = ""
    LANGSMITH_TRACING: bool = True
    LANGSMITH_PROJECT: str = "quizzer"
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"

    GEN_CONCURRENCY: int = 5

    # API server settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_provider_key(self) -> "Settings":
        required: dict[str, tuple[str, str]] = {
            "google": ("GEMINI_API_KEY", self.GEMINI_API_KEY),
            "groq": ("GROQ_API_KEY", self.GROQ_API_KEY),
            "openai": ("OPENAI_API_KEY", self.OPENAI_API_KEY),
        }
        key_name, key_value = required[self.MODEL_PROVIDER]
        if not key_value:
            raise ValueError(
                f"{key_name} is required when MODEL_PROVIDER is '{self.MODEL_PROVIDER}'"
            )
        return self


settings = Settings()  # type: ignore
