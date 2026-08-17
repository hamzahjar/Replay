from datetime import datetime, timezone
from typing import Any

from app.providers.base import Provider


class ChatGPTProvider(Provider):
    def parse_conversations(
        self,
        data: Any,
    ) -> list[dict]:
        if not isinstance(data, list):
            raise ValueError(
                "ChatGPT export must contain a list of conversations."
            )

        conversations = []

        for conversation in data:
            if not isinstance(conversation, dict):
                raise ValueError(
                    "Each conversation must be an object."
                )

            mapping = conversation.get("mapping")

            if not isinstance(mapping, dict):
                raise ValueError(
                    "Each conversation must contain a valid mapping."
                )

            messages = self._parse_messages(mapping)

            if not messages:
                continue

            conversations.append(
                {
                    "provider": "chatgpt",
                    "provider_conversation_id": conversation.get(
                        "conversation_id"
                    ),
                    "title": conversation.get("title")
                    or "Untitled Conversation",
                    "created_at": self._parse_timestamp(
                        conversation.get("create_time")
                    ),
                    "updated_at": self._parse_timestamp(
                        conversation.get("update_time")
                    ),
                    "messages": messages,
                }
            )

        return conversations

    def _parse_messages(
        self,
        mapping: dict,
    ) -> list[dict]:
        messages = []

        for node in mapping.values():
            message = node.get("message")

            if not message:
                continue

            author = message.get("author", {})
            role = author.get("role")

            if role not in {"user", "assistant", "system"}:
                continue

            content = message.get("content", {})
            parts = content.get("parts", [])

            text_parts = [
                part
                for part in parts
                if isinstance(part, str)
            ]

            if not text_parts:
                continue

            messages.append(
                {
                    "role": role,
                    "content": "\n".join(text_parts),
                    "created_at": self._parse_timestamp(
                        message.get("create_time")
                    ),
                }
            )

        messages.sort(
            key=lambda message: (
                message["created_at"]
                or datetime.min.replace(tzinfo=timezone.utc)
            )
        )

        for index, message in enumerate(messages):
            message["sequence_number"] = index

        return messages

    def _parse_timestamp(
        self,
        timestamp: float | int | None,
    ) -> datetime | None:
        if timestamp is None:
            return None

        return datetime.fromtimestamp(
            timestamp,
            tz=timezone.utc,
        )