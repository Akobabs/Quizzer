from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from ..core import logger, settings


def get_llm(provider: str = settings.MODEL_PROVIDER):
    """Return an LLM instance for the given provider. Only instantiates the requested provider."""
    if provider == "google":
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            api_key=SecretStr(settings.GEMINI_API_KEY),
            temperature=1.0,
        )
    elif provider == "groq":
        return ChatGroq(
            model=settings.GROQ_MODEL,
            api_key=SecretStr(settings.GROQ_API_KEY),
            temperature=1.0,
        )
    elif provider == "openai":
        return ChatOpenAI(
            model=settings.OPENAI_MODEL,
        )
    else:
        raise ValueError(f"Unsupported model provider: {provider}")


def main() -> None:
    prompt = "Hello there! Can you tell me a joke?"
    try:
        llm = get_llm()
        response = llm.invoke(prompt)
        content = getattr(response, "content", response)
        logger.debug(f"LLM response: {content}")
    except Exception as error:
        logger.exception(f"LLM invocation failed: {error}")
        raise


# Lazy singleton for the configured provider only — unused providers are never instantiated
LLM = MODEL = get_llm()


if __name__ == "__main__":
    main()
