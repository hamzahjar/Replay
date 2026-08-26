from typing import Any

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.ai import ConversationMetadata


class AIService:
    def __init__(self):
        settings = get_settings()

        self.client = OpenAI(
            api_key=settings.openai_api_key
        )

        self.model = settings.openai_model

    def generate_conversation_metadata(
        self,
        messages: list[dict[str, Any]],
    ) -> ConversationMetadata:
        conversation_text = self._build_conversation_text(messages)

        if not conversation_text.strip():
            raise ValueError(
                "Cannot generate metadata for an empty conversation."
            )

        response = self.client.responses.parse(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You analyze complete AI conversations and generate "
                        "metadata for them.\n\n"
                        "Read the ENTIRE conversation carefully before "
                        "responding.\n\n"
                        "Generate:\n"
                        "1. A concise but accurate title describing the "
                        "actual topic of the conversation.\n"
                        "2. A short description explaining what the "
                        "conversation is about.\n"
                        "3. A detailed long description summarizing the "
                        "important topics, goals, questions, decisions, "
                        "and outcomes discussed.\n\n"
                        "Do not simply repeat the first user message. "
                        "Base the metadata on the conversation as a whole."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Analyze this complete conversation and generate "
                        "the requested metadata:\n\n"
                        f"{conversation_text}"
                    ),
                },
            ],
            text_format=ConversationMetadata,
        )

        metadata = response.output_parsed

        if metadata is None:
            for output in response.output:
                if output.type != "message":
                    continue

                for content in output.content:
                    if content.type != "output_text":
                        continue

                    if content.parsed is not None:
                        return content.parsed

            raise ValueError(
                "AI response did not contain parsed conversation metadata."
            )

        return metadata

    def _build_conversation_text(
        self,
        messages: list[dict[str, Any]],
    ) -> str:
        parts: list[str] = []

        for message in messages:
            role = str(message.get("role", "unknown")).upper()
            content = str(message.get("content", "")).strip()

            if not content:
                continue

            parts.append(
                f"{role}:\n{content}"
            )

        return "\n\n".join(parts)