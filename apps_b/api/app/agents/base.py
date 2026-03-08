"""Base agent interface — defines the contract for all specialist agents.

This is a STUB for Phase 4. The actual implementation will:
1. Define BaseAgent with async run() method
2. Define AgentContext (session state, tools, history)
3. Define AgentResponse (structured output)
4. Support parallel execution of multiple agents
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class AgentContext:
    """Context passed to each agent invocation."""
    user_message: str
    session_id: str
    user_id: str
    org_id: str
    history: list[dict] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResponse:
    """Structured response from an agent."""
    content: str
    agent_name: str
    confidence: float = 1.0
    citations: list[dict] = field(default_factory=list)
    actions: list[dict] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """Abstract base class for all LexHelm agents."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResponse:
        """Execute the agent's task and return a structured response."""
        ...
