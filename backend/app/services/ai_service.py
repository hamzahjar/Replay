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

        response = self.client.responses.parse(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You generate concise metadata for AI conversations. "
                        "Create an accurate title, a short description, and "
                        "a useful long description based only on the "
                        "conversation provided."
                    ),
                },
                {
                    "role": "user",
                    "content": conversation_text,
                },
            ],
            text_format=ConversationMetadata,
        )

        output = response.output[0]

        if output.type != "message":
            raise ValueError(
                "AI returned an unexpected response type."
            )

        content = output.content[0]

        if content.type != "output_text":
            raise ValueError(
                "AI returned an unexpected content type."
            )

        if content.parsed is None:
            raise ValueError(
                "AI response could not be parsed."
            )

        return content.parsed

    def _build_conversation_text(
        self,
        messages: list[dict[str, Any]],
    ) -> str:
        parts = []

        for message in messages:
            parts.append(
                f"{message['role'].upper()}:\n{message['content']}"
            )

        return "\n\n".join(parts)