from __future__ import annotations

from abc import ABC, abstractmethod


class ModelGateway(ABC):
    @abstractmethod
    def is_available(self) -> bool:
        raise NotImplementedError
