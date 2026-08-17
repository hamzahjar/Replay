from abc import ABC, abstractmethod
from typing import Any


class Provider(ABC):
    @abstractmethod
    def parse_conversations(
        self,
        data: Any,
    ) -> list[dict]:
        raise NotImplementedError