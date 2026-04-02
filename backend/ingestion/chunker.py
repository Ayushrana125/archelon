"""
chunker.py — Builds parent and child chunks from extracted elements.
Parent chunks: section-aware, max 800 tokens, split with overlap if oversized.
Child chunks: sentence-level, max 150 tokens, point back to parent.
"""

import re
from dataclasses import dataclass


# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

PARENT_MAX_TOKENS = 800
CHILD_MAX_TOKENS  = 150
CHILD_OVERLAP     = 30


# ─────────────────────────────────────────────────────────────────────────────
# TOKEN ESTIMATOR  (approx: 1 token ≈ 4 chars)
# ─────────────────────────────────────────────────────────────────────────────

def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


# ─────────────────────────────────────────────────────────────────────────────
# CHUNK SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ParentChunk:
    parent_id:    str
    doc_title:    str
    heading_path: list
    markdown:     str
    page_start:   int
    token_count:  int


@dataclass
class ChildChunk:
    child_id:     str
    parent_id:    str
    doc_title:    str
    heading_path: list
    markdown:     str
    page_start:   int
    token_count:  int


# ─────────────────────────────────────────────────────────────────────────────
# ELEMENT → MARKDOWN
# ─────────────────────────────────────────────────────────────────────────────

HEADING_MD = {"title": "# ", "h1": "# ", "h2": "## ", "h3": "### "}

def element_to_markdown(el) -> str:
    if el.type in HEADING_MD:  return HEADING_MD[el.type] + el.text
    if el.type == "list_item": return "- " + el.text
    if el.type == "code":      return el.text if el.text.startswith("```") else f"```\n{el.text}\n```"
    if el.type == "table":     return el.text
    if el.type == "caption":   return f"*{el.text}*"
    return el.text


# ─────────────────────────────────────────────────────────────────────────────
# PARENT CHUNKING
# ─────────────────────────────────────────────────────────────────────────────

def build_parent_chunks(elements: list, doc_title: str) -> list:
    HEADING_TYPES = {"title", "h1", "h2", "h3"}
    heading_path             = []
    current_section_elements = []
    current_page             = 0
    all_sections             = []

    def flush_section():
        if current_section_elements:
            all_sections.append((list(heading_path), list(current_section_elements), current_page))

    for el in elements:
        if el.type in HEADING_TYPES:
            flush_section()
            current_section_elements = [el]
            current_page             = el.page
            level                    = {"title": 0, "h1": 1, "h2": 2, "h3": 3}[el.type]
            heading_path             = heading_path[:level]
            heading_path.append(el.text)
        else:
            current_section_elements.append(el)
            if el.page and not current_page:
                current_page = el.page

    flush_section()

    chunks      = []
    chunk_index = 0

    def make_chunk(h_path, md_text, page, idx):
        return ParentChunk(
            parent_id    = f"parent_{idx:04d}",
            doc_title    = doc_title,
            heading_path = h_path,
            markdown     = md_text,
            page_start   = page,
            token_count  = estimate_tokens(md_text),
        )

    for h_path, sec_elements, page in all_sections:
        md_lines = [element_to_markdown(el) for el in sec_elements]
        full_md  = "\n\n".join(line for line in md_lines if line.strip())

        if estimate_tokens(full_md) <= PARENT_MAX_TOKENS:
            chunks.append(make_chunk(h_path, full_md, page, chunk_index))
            chunk_index += 1
        else:
            paragraphs = [element_to_markdown(el) for el in sec_elements if element_to_markdown(el).strip()]
            buf        = []
            buf_tokens = 0

            for para in paragraphs:
                para_tokens = estimate_tokens(para)
                if buf_tokens + para_tokens > PARENT_MAX_TOKENS and buf:
                    chunks.append(make_chunk(h_path, "\n\n".join(buf), page, chunk_index))
                    chunk_index   += 1
                    overlap_tokens = 0
                    overlap_buf    = []
                    for p in reversed(buf):
                        pt = estimate_tokens(p)
                        if overlap_tokens + pt > CHILD_OVERLAP * 4: break
                        overlap_buf.insert(0, p)
                        overlap_tokens += pt
                    buf        = overlap_buf + [para]
                    buf_tokens = sum(estimate_tokens(p) for p in buf)
                else:
                    buf.append(para)
                    buf_tokens += para_tokens

            if buf:
                chunks.append(make_chunk(h_path, "\n\n".join(buf), page, chunk_index))
                chunk_index += 1

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# CHILD CHUNKING
# ─────────────────────────────────────────────────────────────────────────────

def split_into_sentences(text: str) -> list:
    if text.startswith("```") or text.startswith("|"): return [text]
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def build_child_chunks(parent_chunks: list) -> list:
    children    = []
    child_index = 0

    for parent in parent_chunks:
        lines           = parent.markdown.split("\n\n")
        sentence_buffer = []
        buffer_tokens   = 0

        def flush_buffer():
            nonlocal child_index, sentence_buffer, buffer_tokens
            if not sentence_buffer: return
            md = " ".join(sentence_buffer)
            children.append(ChildChunk(
                child_id     = f"child_{child_index:05d}",
                parent_id    = parent.parent_id,
                doc_title    = parent.doc_title,
                heading_path = parent.heading_path,
                markdown     = md,
                page_start   = parent.page_start,
                token_count  = estimate_tokens(md),
            ))
            child_index    += 1
            sentence_buffer = []
            buffer_tokens   = 0

        for line in lines:
            line = line.strip()
            if not line: continue

            if line.startswith("```") or line.startswith("|"):
                flush_buffer()
                # Split oversized code/table blocks into chunks
                if estimate_tokens(line) > CHILD_MAX_TOKENS:
                    words = line.split()
                    buf, buf_t = [], 0
                    for word in words:
                        wt = estimate_tokens(word)
                        if buf_t + wt > CHILD_MAX_TOKENS and buf:
                            md = " ".join(buf)
                            children.append(ChildChunk(
                                child_id=f"child_{child_index:05d}",
                                parent_id=parent.parent_id,
                                doc_title=parent.doc_title,
                                heading_path=parent.heading_path,
                                markdown=md,
                                page_start=parent.page_start,
                                token_count=estimate_tokens(md),
                            ))
                            child_index += 1
                            buf, buf_t = [], 0
                        buf.append(word)
                        buf_t += wt
                    if buf:
                        md = " ".join(buf)
                        children.append(ChildChunk(
                            child_id=f"child_{child_index:05d}",
                            parent_id=parent.parent_id,
                            doc_title=parent.doc_title,
                            heading_path=parent.heading_path,
                            markdown=md,
                            page_start=parent.page_start,
                            token_count=estimate_tokens(md),
                        ))
                        child_index += 1
                else:
                    children.append(ChildChunk(
                        child_id     = f"child_{child_index:05d}",
                        parent_id    = parent.parent_id,
                        doc_title    = parent.doc_title,
                        heading_path = parent.heading_path,
                        markdown     = line,
                        page_start   = parent.page_start,
                        token_count  = estimate_tokens(line),
                    ))
                    child_index += 1
                continue

            if line.startswith("#"):
                flush_buffer()
                sentence_buffer = [line]
                buffer_tokens   = estimate_tokens(line)
                continue

            for sent in split_into_sentences(line):
                sent_tokens = estimate_tokens(sent)
                if buffer_tokens + sent_tokens > CHILD_MAX_TOKENS and sentence_buffer:
                    flush_buffer()
                sentence_buffer.append(sent)
                buffer_tokens += sent_tokens

        flush_buffer()

    return children
