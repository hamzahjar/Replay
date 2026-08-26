import re
from datetime import datetime, timezone
from typing import Any

from app.providers.base import Provider


CITATION_BLOCK_PATTERN = re.compile(
    "\ue200[^\ue201]*\ue201"
)

PRIVATE_MARKER_PATTERN = re.compile(
    "[\ue200-\ue20f]"
)

TRAILING_SPACE_PATTERN = re.compile(
    r"[ \t]{2,}"
)


class ChatGPTProvider(Provider):
    VISIBLE_ROLES = {"user", "assistant"}

    SKIPPED_CONTENT_TYPES = {
        # Custom instructions / profile context, repeated in every
        # conversation and never shown as a chat message.
        "user_editable_context",
        "model_editable_context",
        # o1/o3-style reasoning. ChatGPT hides these behind "Thought
        # for N seconds" rather than showing them as replies, so they
        # are deliberately excluded from the imported transcript.
        "thoughts",
        "reasoning_recap",
        # Browsing scaffolding emitted alongside search results.
        "tether_quote",
        "tether_browsing_display",
        "system_error",
    }

    IMAGE_PLACEHOLDER = "[Image]"
    ATTACHMENT_PLACEHOLDER = "[Attachment]"

    def __init__(
        self,
        include_system_messages: bool = False,
        include_tool_messages: bool = False,
    ):
        self.include_system_messages = include_system_messages
        self.include_tool_messages = include_tool_messages

    def parse_conversations(
        self,
        data: Any,
    ) -> list[dict]:
        if isinstance(data, dict):
            unwrapped = None

            for key in ("conversations", "items", "data"):
                if isinstance(data.get(key), list):
                    unwrapped = data[key]
                    break

            if unwrapped is None:
                self._reject_unsupported_shape(data)

            data = unwrapped

        if not isinstance(data, list):
            raise ValueError(
                "ChatGPT export must contain a list of conversations."
            )

        conversations = []

        for conversation in data:
            parsed = self._parse_conversation(conversation)

            if parsed is not None:
                conversations.append(parsed)

        return conversations

    def _reject_unsupported_shape(
        self,
        data: dict,
    ) -> None:
        if isinstance(data.get("messages"), list):
            raise ValueError(
                "This looks like a single conversation exported by a "
                "browser extension, not ChatGPT's own export. Replay "
                "needs the conversations.json file from Settings > "
                "Data controls > Export data."
            )

        if isinstance(data.get("mapping"), dict):
            raise ValueError(
                "This file contains a single conversation. Replay needs "
                "the full conversations.json file from ChatGPT's data "
                "export, which contains a list of conversations."
            )

        raise ValueError(
            "This file is not a ChatGPT conversations.json export."
        )

    def _parse_conversation(
        self,
        conversation: Any,
    ) -> dict | None:
        if not isinstance(conversation, dict):
            return None

        mapping = conversation.get("mapping")

        if not isinstance(mapping, dict):
            return None

        created_at = self._parse_timestamp(
            conversation.get("create_time")
        )

        messages = self._parse_messages(
            mapping=mapping,
            current_node=conversation.get("current_node"),
            fallback_created_at=created_at,
        )

        if not messages:
            return None

        provider_conversation_id = (
            conversation.get("conversation_id")
            or conversation.get("id")
        )

        if not provider_conversation_id:
            return None

        provider_conversation_id = str(
            provider_conversation_id
        )

        return {
            "provider": "chatgpt",
            "provider_conversation_id": provider_conversation_id,
            "title": conversation.get("title")
            or "Untitled Conversation",
            "created_at": created_at,
            "updated_at": self._parse_timestamp(
                conversation.get("update_time")
            ),
            "messages": messages,
        }

    def _parse_messages(
        self,
        mapping: dict,
        current_node: Any,
        fallback_created_at: datetime | None,
    ) -> list[dict]:
        thread = self._select_thread(mapping, current_node)

        messages = []
        last_created_at = fallback_created_at

        for node in thread:
            if not isinstance(node, dict):
                continue

            message = self._extract_message(
                node.get("message"),
                fallback_created_at=last_created_at,
            )

            if message is None:
                continue

            if message["created_at"] is not None:
                last_created_at = message["created_at"]

            message["sequence_number"] = len(messages)
            messages.append(message)

        return messages

    def _select_thread(
        self,
        mapping: dict,
        current_node: Any,
    ) -> list[dict]:
        thread = self._walk_up_from_current_node(mapping, current_node)

        if thread:
            return thread

        thread = self._walk_down_from_root(mapping)

        if thread:
            return thread

        return self._all_nodes_by_time(mapping)

    def _walk_up_from_current_node(
        self,
        mapping: dict,
        current_node: Any,
    ) -> list[dict]:
        if not isinstance(current_node, str):
            return []

        thread = []
        visited = set()
        node_id = current_node

        while isinstance(node_id, str) and node_id not in visited:
            visited.add(node_id)

            node = mapping.get(node_id)

            if not isinstance(node, dict):
                break

            thread.append(node)
            node_id = node.get("parent")

        thread.reverse()

        return thread

    def _walk_down_from_root(
        self,
        mapping: dict,
    ) -> list[dict]:
        root_id = None

        for node_id, node in mapping.items():
            if not isinstance(node, dict):
                continue

            parent = node.get("parent")

            if parent is None or parent not in mapping:
                root_id = node_id
                break

        if root_id is None:
            return []

        thread = []
        visited = set()
        node_id = root_id

        while isinstance(node_id, str) and node_id not in visited:
            visited.add(node_id)

            node = mapping.get(node_id)

            if not isinstance(node, dict):
                break

            thread.append(node)

            children = node.get("children")

            if not isinstance(children, list) or not children:
                break

            node_id = self._select_child(mapping, children)

        return thread

    def _select_child(
        self,
        mapping: dict,
        children: list,
    ) -> Any:
        for child_id in reversed(children):
            if child_id in mapping:
                return child_id

        return None

    def _all_nodes_by_time(
        self,
        mapping: dict,
    ) -> list[dict]:
        nodes = [
            node
            for node in mapping.values()
            if isinstance(node, dict)
        ]

        def sort_key(node: dict) -> float:
            message = node.get("message")

            if not isinstance(message, dict):
                return 0.0

            create_time = message.get("create_time")

            if isinstance(create_time, (int, float)):
                return float(create_time)

            return 0.0

        nodes.sort(key=sort_key)

        return nodes

    def _extract_message(
        self,
        message: Any,
        fallback_created_at: datetime | None,
    ) -> dict | None:
        if not isinstance(message, dict):
            return None

        author = message.get("author")

        if not isinstance(author, dict):
            return None

        role = author.get("role")

        if role not in self._allowed_roles():
            return None

        if message.get("weight") == 0:
            return None

        metadata = message.get("metadata")

        if isinstance(metadata, dict):
            if metadata.get("is_visually_hidden_from_conversation"):
                return None

        recipient = message.get("recipient")

        if (
            role == "assistant"
            and isinstance(recipient, str)
            and recipient not in ("", "all")
        ):
            return None

        content = message.get("content")

        if not isinstance(content, dict):
            return None

        if content.get("content_type") in self.SKIPPED_CONTENT_TYPES:
            return None

        text = self._clean_text(self._extract_text(content))

        if not text.strip():
            return None

        created_at = self._parse_timestamp(
            message.get("create_time")
        )

        if created_at is None:
            created_at = fallback_created_at

        return {
            "role": role,
            "content": text,
            "created_at": created_at,
        }

    def _allowed_roles(self) -> set[str]:
        roles = set(self.VISIBLE_ROLES)

        if self.include_system_messages:
            roles.add("system")

        if self.include_tool_messages:
            roles.add("tool")

        return roles

    def _clean_text(
        self,
        text: str,
    ) -> str:
        if not text:
            return text

        if not any(
            "\ue200" <= character <= "\ue20f"
            for character in text
        ):
            return text

        cleaned = CITATION_BLOCK_PATTERN.sub("", text)
        cleaned = PRIVATE_MARKER_PATTERN.sub("", cleaned)
        cleaned = TRAILING_SPACE_PATTERN.sub(" ", cleaned)

        return cleaned.strip()

    def _extract_text(
        self,
        content: dict,
    ) -> str:
        parts = content.get("parts")

        if not isinstance(parts, list):
            parts = []

        text_parts = []

        for part in parts:
            rendered = self._render_part(part)

            if rendered:
                text_parts.append(rendered)

        if not text_parts:
            for key in ("text", "result"):
                value = content.get(key)

                if isinstance(value, str) and value.strip():
                    text_parts.append(value)
                    break

        return "\n".join(text_parts)

    def _render_part(
        self,
        part: Any,
    ) -> str:
        if isinstance(part, str):
            return part

        if not isinstance(part, dict):
            return ""

        content_type = part.get("content_type")

        if content_type == "image_asset_pointer":
            return self.IMAGE_PLACEHOLDER

        if content_type == "audio_transcription":
            transcript = part.get("text")

            if isinstance(transcript, str):
                return transcript

            return ""

        if content_type in {
            "audio_asset_pointer",
            "video_container_asset_pointer",
            "real_time_user_audio_video_asset_pointer",
        }:
            return self.ATTACHMENT_PLACEHOLDER

        for key in ("text", "result"):
            value = part.get(key)

            if isinstance(value, str):
                return value

        return ""

    def _parse_timestamp(
        self,
        timestamp: Any,
    ) -> datetime | None:
        if isinstance(timestamp, bool) or timestamp is None:
            return None

        if not isinstance(timestamp, (int, float)):
            return None

        try:
            return datetime.fromtimestamp(
                timestamp,
                tz=timezone.utc,
            )
        except (OverflowError, OSError, ValueError):
            return None
