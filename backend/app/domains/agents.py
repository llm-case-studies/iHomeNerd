"""Agents domain — autonomous task execution with ReAct loop.

Each agent has a role, a model, and a set of tools it can call.
Tasks are executed via a think→act→observe loop using Ollama.
"""

from __future__ import annotations

import json
import logging
import re
import subprocess

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import ollama, docstore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["agents"])

MAX_ITERATIONS = 6  # Safety limit for ReAct loop


# ---------------------------------------------------------------------------
# Agent definitions
# ---------------------------------------------------------------------------

AGENTS = [
    {
        "id": "a1",
        "name": "Home Automation",
        "role": "Smart Home Controller",
        "status": "idle",
        "model": "gemma4:e2b",
        "tools": ["system_info", "run_command"],
    },
    {
        "id": "a2",
        "name": "Research Assistant",
        "role": "Document & Web Researcher",
        "status": "idle",
        "model": "gemma4:e2b",
        "tools": ["search_docs", "summarize"],
    },
    {
        "id": "a3",
        "name": "Security Monitor",
        "role": "Network Watchdog",
        "status": "idle",
        "model": "gemma4:e2b",
        "tools": ["network_scan", "system_info"],
    },
    {
        "id": "a4",
        "name": "Camera Patrol",
        "role": "On-My-Watch Autonomous Monitor",
        "status": "idle",
        "model": "gemma4:e2b",
        "tools": ["system_info"],
    },
]

# Runtime agent state (status can change)
_agent_state: dict[str, dict] = {a["id"]: dict(a) for a in AGENTS}


def _get_agent(agent_id: str) -> dict | None:
    return _agent_state.get(agent_id)


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _run_cmd(cmd: list[str], timeout: int = 10) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.stdout.strip()[:2000]
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        return f"Error: {e}"


TOOL_DESCRIPTIONS = {
    "system_info": "Get system information. Args: query (string) — what to check, e.g. 'cpu', 'memory', 'disk', 'gpu', 'network', 'uptime'",
    "search_docs": "Search ingested documents. Args: query (string) — the search question",
    "summarize": "Summarize text. Args: text (string) — text to summarize",
    "network_scan": "Scan the local network. Args: target (string) — 'arp' for ARP table, 'routes' for routing, 'ports <ip>' for port check",
    "run_command": "Run a safe read-only system command. Args: command (string) — the command to run (read-only, no writes)",
}

# Commands that are safe to run (read-only)
SAFE_COMMANDS = {"ls", "cat", "head", "df", "free", "uptime", "hostname", "ip", "ping", "whoami", "date", "lscpu", "uname", "ps"}


async def execute_tool(tool_name: str, args: str) -> str:
    """Execute a tool and return the result as a string."""

    if tool_name == "system_info":
        query = args.lower().strip()
        if "cpu" in query:
            return _run_cmd(["lscpu"])
        elif "memory" in query or "ram" in query:
            return _run_cmd(["free", "-h"])
        elif "disk" in query:
            return _run_cmd(["df", "-h"])
        elif "gpu" in query:
            out = _run_cmd(["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader"])
            return out or "No NVIDIA GPU detected"
        elif "network" in query or "ip" in query:
            return _run_cmd(["ip", "addr"])
        elif "uptime" in query:
            return _run_cmd(["uptime"])
        else:
            return _run_cmd(["uname", "-a"])

    elif tool_name == "search_docs":
        try:
            query_embedding = await ollama.embed(args)
            chunks = docstore.search_similar(query_embedding, k=3, min_score=0.4)
            if not chunks:
                return "No relevant documents found."
            results = []
            for c in chunks:
                results.append(f"[{c.document_name} p.{c.page} ({c.relevance:.0%})] {c.text[:300]}")
            return "\n\n".join(results)
        except Exception as e:
            return f"Document search failed: {e}"

    elif tool_name == "summarize":
        try:
            summary = await ollama.generate(
                f"Summarize the following concisely:\n\n{args[:3000]}",
                tier="light",
            )
            return summary.strip()
        except Exception as e:
            return f"Summarization failed: {e}"

    elif tool_name == "network_scan":
        parts = args.strip().split()
        subcmd = parts[0].lower() if parts else "arp"
        if subcmd == "arp":
            return _run_cmd(["ip", "neighbor"])
        elif subcmd == "routes":
            return _run_cmd(["ip", "route"])
        elif subcmd == "ports" and len(parts) > 1:
            target_ip = parts[1]
            # Quick check common ports
            import socket
            results = []
            for port in [22, 80, 443, 8080, 8443, 3000, 5000, 11434, 17777]:
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(1)
                    if s.connect_ex((target_ip, port)) == 0:
                        results.append(f"Port {port}: OPEN")
                    s.close()
                except OSError:
                    pass
            return "\n".join(results) if results else f"No open ports found on {target_ip}"
        return "Usage: arp | routes | ports <ip>"

    elif tool_name == "run_command":
        cmd_parts = args.strip().split()
        if not cmd_parts:
            return "No command provided"
        if cmd_parts[0] not in SAFE_COMMANDS:
            return f"Command '{cmd_parts[0]}' is not in the allowed list: {', '.join(sorted(SAFE_COMMANDS))}"
        return _run_cmd(cmd_parts)

    return f"Unknown tool: {tool_name}"


# ---------------------------------------------------------------------------
# ReAct loop
# ---------------------------------------------------------------------------

async def run_react_loop(agent: dict, task: str) -> list[dict]:
    """Run a ReAct (Reason + Act) loop for the given task.

    Returns a list of activity entries:
    [{"type": "thought"|"action"|"observation"|"message", "content": "..."}]
    """
    activities: list[dict] = []

    # Build available tools description
    available_tools = agent.get("tools", [])
    tools_desc = "\n".join(
        f"- {name}: {TOOL_DESCRIPTIONS.get(name, 'No description')}"
        for name in available_tools
    )

    system_prompt = (
        f"You are '{agent['name']}', a {agent['role']}. "
        f"You have access to these tools:\n{tools_desc}\n\n"
        "To use a tool, respond with:\n"
        "Thought: <your reasoning>\n"
        "Action: <tool_name>(<args>)\n\n"
        "After receiving an observation, continue reasoning or provide your final answer with:\n"
        "Thought: <reasoning>\n"
        "Answer: <your final response to the user>\n\n"
        "Always start with a Thought. Be concise."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": task},
    ]

    for iteration in range(MAX_ITERATIONS):
        try:
            response = await ollama.chat(messages, tier="medium")
        except Exception as e:
            activities.append({"type": "message", "content": f"Error: Model unavailable — {e}"})
            break

        # Parse the response for Thought, Action, Answer
        thought_match = re.search(r"Thought:\s*(.+?)(?=Action:|Answer:|$)", response, re.DOTALL)
        action_match = re.search(r"Action:\s*(\w+)\((.+?)\)", response, re.DOTALL)
        answer_match = re.search(r"Answer:\s*(.+?)$", response, re.DOTALL)

        if thought_match:
            activities.append({"type": "thought", "content": thought_match.group(1).strip()})

        if action_match:
            tool_name = action_match.group(1).strip()
            tool_args = action_match.group(2).strip().strip("\"'")
            activities.append({"type": "action", "content": f"Calling tool: {tool_name}({tool_args})"})

            if tool_name not in available_tools:
                observation = f"Tool '{tool_name}' is not available. Available: {', '.join(available_tools)}"
            else:
                observation = await execute_tool(tool_name, tool_args)

            activities.append({"type": "observation", "content": observation[:1500]})

            # Feed observation back
            messages.append({"role": "assistant", "content": response})
            messages.append({"role": "user", "content": f"Observation: {observation[:1500]}"})
            continue

        if answer_match:
            activities.append({"type": "message", "content": answer_match.group(1).strip()})
            break

        # If no structured output, treat as final answer
        if not action_match and not answer_match:
            activities.append({"type": "message", "content": response.strip()})
            break

    return activities


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/agents")
async def list_agents():
    """List all configured agents."""
    return list(_agent_state.values())


class TaskRequest(BaseModel):
    task: str


@router.post("/agents/{agent_id}/task")
async def assign_task(agent_id: str, req: TaskRequest):
    """Assign a task to an agent and run it."""
    agent = _get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    logger.info("Agent '%s' assigned task: %s", agent["name"], req.task[:100])

    activities = await run_react_loop(agent, req.task)

    return {
        "status": "complete",
        "activities": activities,
    }
