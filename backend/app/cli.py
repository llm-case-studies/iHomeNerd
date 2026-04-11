"""iHomeNerd CLI — quick access to local AI from the terminal."""

from __future__ import annotations

import argparse
import asyncio
import sys

from . import ollama
from .capabilities import capabilities_response


async def cmd_status():
    health = await ollama.check_health()
    caps = await capabilities_response()
    print(f"iHomeNerd {caps['version']} on {caps['hostname']}")
    print(f"Ollama: {'connected' if health['ok'] else 'offline'}")
    if health.get("models"):
        print(f"Models: {', '.join(health['models'])}")
    available = [k for k, v in caps["capabilities"].items() if v["available"]]
    if available:
        print(f"Capabilities: {', '.join(available)}")


async def cmd_translate(text: str, target: str, source: str = "auto"):
    from .domains.language import translate

    result = await translate({"text": text, "source": source, "target": target})
    print(result["translation"])


async def cmd_chat(text: str):
    result = await ollama.chat([{"role": "user", "content": text}])
    print(result)


def main():
    parser = argparse.ArgumentParser(prog="ihomenerd", description="iHomeNerd CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("status", help="Show Nerd status")
    sub.add_parser("serve", help="Start the Nerd server")

    t = sub.add_parser("translate", help="Translate text")
    t.add_argument("text")
    t.add_argument("--to", required=True, dest="target")
    t.add_argument("--from", default="auto", dest="source")

    c = sub.add_parser("chat", help="Chat with local AI")
    c.add_argument("text")

    args = parser.parse_args()

    if args.command == "status":
        asyncio.run(cmd_status())
    elif args.command == "serve":
        from .main import main as serve_main
        serve_main()
    elif args.command == "translate":
        asyncio.run(cmd_translate(args.text, args.target, args.source))
    elif args.command == "chat":
        asyncio.run(cmd_chat(args.text))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
