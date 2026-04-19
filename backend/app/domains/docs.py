"""Docs domain — local document RAG pipeline.

Ingest local folders (PDF, TXT, MD, CSV), chunk text, embed with Ollama,
and answer questions with source citations.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import ollama, docstore, vision

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/docs", tags=["docs"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IngestRequest(BaseModel):
    path: str
    collectionId: str
    watch: bool = False
    ocr: bool = False  # reserved for future OCR support


class AskRequest(BaseModel):
    question: str
    collections: list[str] = Field(default_factory=list)
    maxSources: int = 5


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/collections")
async def list_collections():
    """List all document collections."""
    collections = docstore.list_collections()
    return {
        "collections": [
            {
                "id": c.id,
                "name": c.name,
                "path": c.path,
                "documentCount": c.document_count,
                "chunkCount": c.chunk_count,
                "lastIngested": c.last_ingested,
                "watching": c.watching,
            }
            for c in collections
        ]
    }


@router.post("/ingest")
async def ingest_folder(req: IngestRequest):
    """Ingest a local folder into a document collection.

    Scans for supported files, extracts text, chunks, and embeds.
    """
    folder = Path(req.path).expanduser().resolve()
    if not folder.exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {req.path}")
    if not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {req.path}")

    # Create or update collection
    collection = docstore.create_collection(
        collection_id=req.collectionId,
        name=req.collectionId.replace("-", " ").title(),
        path=str(folder),
        watching=req.watch,
    )

    # Discover supported files — include images when OCR is enabled
    supported = set(docstore.SUPPORTED_EXTENSIONS)
    if req.ocr and vision.is_available():
        supported |= vision.IMAGE_EXTENSIONS

    files = [
        f for f in folder.rglob("*")
        if f.is_file() and f.suffix.lower() in supported
    ]

    files_ingested = 0
    chunks_created = 0

    for filepath in files:
        # Route images through vision OCR, text files through normal extraction
        if req.ocr and vision.is_image_file(filepath):
            pages = await vision.ocr_for_ingest(filepath)
        else:
            pages = docstore.extract_text_from_file(filepath)
        if not pages:
            continue

        # Count total pages for PDF, 1 for text files
        page_count = max(p[0] for p in pages) if pages else 0
        doc_id = docstore.add_document(
            collection_id=req.collectionId,
            filename=filepath.name,
            filepath=str(filepath),
            page_count=page_count,
        )

        # Chunk and embed each page
        batch = []
        position = 0
        for page_num, text in pages:
            text_chunks = docstore.chunk_text(text)
            for chunk_text in text_chunks:
                # Generate embedding via Ollama
                try:
                    embedding = await ollama.embed(chunk_text)
                except Exception as e:
                    logger.warning("Embedding failed for chunk in %s: %s", filepath.name, e)
                    embedding = None
                batch.append((req.collectionId, doc_id, page_num, position, chunk_text, embedding))
                position += 1

        if batch:
            docstore.add_chunks_batch(batch)
            chunks_created += len(batch)

        files_ingested += 1
        logger.info("Ingested %s: %d chunks", filepath.name, len(batch))

    logger.info(
        "Collection '%s': %d files ingested, %d chunks created",
        req.collectionId, files_ingested, chunks_created,
    )

    return {
        "collectionId": req.collectionId,
        "filesFound": len(files),
        "filesIngested": files_ingested,
        "chunksCreated": chunks_created,
        "status": "complete",
    }


@router.post("/ask")
async def ask_docs(req: AskRequest):
    """RAG query — find relevant chunks and generate an answer.

    1. Embed the question
    2. Vector-search across selected collections
    3. Build a context prompt with top chunks
    4. Generate an answer with Ollama
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Step 1: Embed the question
    try:
        query_embedding = await ollama.embed(req.question)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Embedding model not available: {e}")

    # Step 2: Vector search
    chunks = docstore.search_similar(
        query_embedding=query_embedding,
        collection_ids=req.collections if req.collections else None,
        k=req.maxSources,
        min_score=0.4,
    )

    # Step 3: Build context and generate answer
    if chunks:
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(
                f"[Source {i}: {chunk.document_name}, page {chunk.page}]\n{chunk.text}"
            )
        context = "\n\n---\n\n".join(context_parts)

        prompt = (
            "You are a helpful assistant answering questions about the user's local documents. "
            "Use ONLY the provided sources to answer. If the sources don't contain enough information, say so.\n\n"
            f"Sources:\n{context}\n\n"
            f"Question: {req.question}\n\n"
            "Answer concisely and cite which source(s) you used."
        )

        answer = await ollama.generate(prompt, tier="medium")
    else:
        answer = "I couldn't find any relevant information in your selected collections. Try adding more documents or rephrasing your question."

    # Step 4: Build source references
    sources = [
        {
            "collection": chunk.collection_id,
            "document": chunk.document_name,
            "page": chunk.page,
            "excerpt": chunk.text[:300] + ("..." if len(chunk.text) > 300 else ""),
            "relevance": chunk.relevance,
        }
        for chunk in chunks
    ]

    model = ollama.resolve("medium")

    return {
        "answer": answer.strip(),
        "sources": sources,
        "model": model or "unknown",
    }
