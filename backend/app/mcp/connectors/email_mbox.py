from __future__ import annotations

from email.message import Message
from pathlib import Path
import mailbox

from app.mcp.server import MCPRequest, MCPResponse


class EmailMboxConnector:
    name = "email_mbox"

    def __init__(self, mbox_path: Path) -> None:
        self.mbox_path = mbox_path

    def _open_mbox(self) -> mailbox.mbox:
        self.mbox_path.parent.mkdir(parents=True, exist_ok=True)
        return mailbox.mbox(self.mbox_path)

    def _summarize(self, msg: Message, index: int) -> dict[str, str | int | None]:
        return {
            "id": index,
            "from": msg.get("from"),
            "to": msg.get("to"),
            "subject": msg.get("subject"),
            "date": msg.get("date"),
        }

    async def handle(self, request: MCPRequest) -> MCPResponse:
        if request.action not in {"list", "get"}:
            return MCPResponse(ok=False, error="Unsupported action")

        mbox = self._open_mbox()
        try:
            messages = list(mbox)
        finally:
            mbox.close()

        if request.action == "list":
            limit = 20
            if request.payload and isinstance(request.payload.get("limit"), int):
                limit = int(request.payload["limit"])
            summaries = [
                self._summarize(msg, idx) for idx, msg in enumerate(messages[-limit:], start=max(0, len(messages) - limit))
            ]
            return MCPResponse(ok=True, data={"messages": summaries})

        if not request.payload or request.payload.get("id") is None:
            return MCPResponse(ok=False, error="Missing message id")

        try:
            msg_id = int(request.payload["id"])
        except (TypeError, ValueError):
            return MCPResponse(ok=False, error="Invalid message id")

        if msg_id < 0 or msg_id >= len(messages):
            return MCPResponse(ok=False, error="Message id out of range")

        msg = messages[msg_id]
        payload = {
            "id": msg_id,
            "from": msg.get("from"),
            "to": msg.get("to"),
            "subject": msg.get("subject"),
            "date": msg.get("date"),
            "body": msg.get_payload(),
        }
        return MCPResponse(ok=True, data=payload)
