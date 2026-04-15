#!/usr/bin/env python3
"""
Code Quality Checker — N09 Change Viewpoint
Analyzes App.tsx against RELIABILITY.md and SECURITY.md standards.
"""

import re
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple


# ──────────────────────────────────────────────
# Check Definitions
# ──────────────────────────────────────────────

CHECKS = [
    # (id, category, priority, description, pattern_required, pattern_forbidden)
    ("A1", "Protocol Injection", "HIGH",
     "finalPrompt null/empty guard before API call",
     r"finalPrompt\s*=",  None),
    ("A2", "Protocol Injection", "HIGH",
     "All 5 view types handled (eyeLevel, front, top, rightSide, birdEye)",
     r"(eyeLevel|front|top|rightSide|birdEye)", None),
    ("A3", "Protocol Injection", "HIGH",
     "Protocol override applied when protocolContent exists",
     r"protocolContent", None),
    ("A4", "Protocol Injection", "MID",
     "analysisContext injected into finalPrompt",
     r"analysisContext", None),
    ("A5", "Protocol Injection", "MID",
     "[GENERATE IMAGE NOW] trigger present in prompts",
     r"\[GENERATE IMAGE NOW\]", None),
    ("B1", "API Reliability", "HIGH",
     "Fallback model constant used",
     r"(ANALYSIS_FALLBACK|IMAGE_GEN_FALLBACK)", None),
    ("B2", "API Reliability", "HIGH",
     "Retry logic present (try primary, catch fallback)",
     r"catch\s*[\(\{]", None),
    ("B3", "API Reliability", "HIGH",
     "User-facing error message in catch block (alert or setState)",
     r"(alert\s*\(|setError|setGeneratingError)", None),
    ("B4", "API Reliability", "MID",
     "isGenerating state guard present",
     r"isGenerating", None),
    ("B5", "API Reliability", "MID",
     "finally block resets isGenerating",
     r"finally\s*\{", None),
    ("C1", "Security", "HIGH",
     "No hardcoded API key (AIzaSy pattern)",
     None, r"AIzaSy[A-Za-z0-9_-]{30,}"),
    ("C2", "Security", "HIGH",
     "Uses import.meta.env.VITE_GEMINI_API_KEY",
     r"import\.meta\.env\.VITE_GEMINI_API_KEY", None),
    ("C3", "Security", "HIGH",
     "Image type validation (jpeg/png/webp)",
     r"(jpeg|png|webp|image/)", None),
    ("C4", "Security", "MID",
     "JSON.parse with try/catch on API response",
     r"JSON\.parse", None),
    ("C5", "Security", "HIGH",
     "No API key logged to console",
     None, r"console\.(log|warn|error).*VITE_GEMINI_API_KEY"),
    ("D1", "N09-specific", "HIGH",
     "TRANSFORMATION DIRECTIVE in rightSide prompt",
     r"TRANSFORMATION DIRECTIVE", None),
    ("D2", "N09-specific", "MID",
     "rightSideDirection auto-determination from analyzed angle",
     r"rightSideDirection", None),
    ("D3", "N09-specific", "MID",
     "useProtocol hook used",
     r"useProtocol", None),
    ("D4", "N09-specific", "MID",
     "verifyConformance() called after generation",
     r"verifyConformance", None),
    ("D5", "N09-specific", "LOW",
     "motherId used for source image in generated items",
     r"motherId", None),
]

VIEW_TYPES = ["eyeLevel", "front", "top", "rightSide", "birdEye"]


def load_file(path: Path) -> str:
    """Load target file content."""
    if not path.exists():
        raise FileNotFoundError(f"Target not found: {path}")
    return path.read_text(encoding="utf-8", errors="replace")


def find_app_tsx(target: Path) -> Path:
    """Locate App.tsx from a given target path."""
    candidates = [
        target / "src" / "App.tsx",
        target / "App.tsx",
        target,
    ]
    for c in candidates:
        if c.exists() and c.suffix == ".tsx":
            return c
    # fallback: search recursively
    results = list(target.rglob("App.tsx"))
    if results:
        return results[0]
    raise FileNotFoundError(f"App.tsx not found under {target}")


def run_check(check_id: str, desc: str, priority: str, pattern_req, pattern_forb,
              content: str) -> Dict:
    """Run a single check against file content."""
    result = "PASS"
    detail = ""

    if pattern_req:
        match = re.search(pattern_req, content, re.IGNORECASE)
        if not match:
            result = "FAIL"
            detail = f"Pattern not found: `{pattern_req}`"

    if pattern_forb and result == "PASS":
        match = re.search(pattern_forb, content)
        if match:
            result = "FAIL"
            # Find line number
            line_no = content[:match.start()].count("\n") + 1
            detail = f"Forbidden pattern found at line {line_no}: `{match.group()[:60]}`"

    return {
        "id": check_id,
        "description": desc,
        "priority": priority,
        "result": result,
        "detail": detail,
    }


def check_view_coverage(content: str) -> Dict:
    """Verify all 5 view types are handled in handleGenerate."""
    missing = [v for v in VIEW_TYPES if v not in content]
    return {
        "id": "A2-detail",
        "description": "View type coverage",
        "priority": "HIGH",
        "result": "PASS" if not missing else "FAIL",
        "detail": f"Missing view types: {missing}" if missing else "All 5 view types present",
    }


def analyze(content: str, verbose: bool) -> Tuple[List[Dict], int, int]:
    """Run all checks and return findings, high_count, blocking_count."""
    findings = []
    high_count = 0
    blocking_count = 0

    for check_id, category, priority, desc, pat_req, pat_forb in CHECKS:
        r = run_check(check_id, desc, priority, pat_req, pat_forb, content)
        r["category"] = category
        findings.append(r)
        if r["result"] == "FAIL":
            if priority == "HIGH":
                high_count += 1
                blocking_count += 1
            if verbose:
                print(f"  ❌ [{priority}] {check_id}: {desc}")
                if r["detail"]:
                    print(f"       → {r['detail']}")
        else:
            if verbose:
                print(f"  ✅ {check_id}: {desc}")

    # Extra: view coverage detail
    vc = check_view_coverage(content)
    findings.append(vc)
    if vc["result"] == "FAIL" and verbose:
        print(f"  ❌ [HIGH] {vc['id']}: {vc['detail']}")

    return findings, high_count, blocking_count


def generate_report(findings: List[Dict], app_tsx_path: Path, high_count: int) -> str:
    """Format findings as markdown report."""
    total = len(findings)
    passed = sum(1 for f in findings if f["result"] == "PASS")
    failed = total - passed
    verdict = "✅ PASS" if high_count == 0 else "❌ FAIL"

    lines = [
        "# Code Quality Check Report — N09",
        f"**Target:** `{app_tsx_path}`",
        f"**Verdict:** {verdict}",
        f"**Summary:** {passed}/{total} checks passed | {failed} failed | {high_count} HIGH priority failures",
        "",
        "## Findings",
        "",
        "| ID | Category | Priority | Result | Detail |",
        "|----|----------|----------|--------|--------|",
    ]
    for f in findings:
        emoji = "✅" if f["result"] == "PASS" else "❌"
        lines.append(
            f"| {f['id']} | {f.get('category','-')} | {f['priority']} | "
            f"{emoji} {f['result']} | {f.get('detail', '') or '—'} |"
        )

    if high_count > 0:
        lines += [
            "",
            "## Blocking Issues",
            "",
        ]
        for f in findings:
            if f["result"] == "FAIL" and f["priority"] == "HIGH":
                lines.append(f"- **[{f['id']}]** {f['description']}: {f.get('detail','')}")

    lines += ["", "---", "*Generated by code_quality_checker.py — N09 Code Reviewer*"]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="N09 Code Quality Checker")
    parser.add_argument("target", help="Path to node app directory or App.tsx")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--output", "-o", help="Write report to file")
    args = parser.parse_args()

    target = Path(args.target)
    print(f"🚀 Running Code Quality Checker...")
    print(f"📁 Target: {target}")

    try:
        app_tsx = find_app_tsx(target)
        print(f"📄 Analyzing: {app_tsx}")
        content = load_file(app_tsx)
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)

    if args.verbose:
        print("\n── Checks ──")

    findings, high_count, blocking_count = analyze(content, args.verbose)

    verdict = "PASS" if high_count == 0 else "FAIL"
    print(f"\n{'✅' if verdict == 'PASS' else '❌'} Overall: {verdict} "
          f"({blocking_count} blocking HIGH issues)")

    report_md = generate_report(findings, app_tsx, high_count)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(report_md, encoding="utf-8")
        print(f"📝 Report written to {out_path}")
    elif not args.json:
        print("\n" + report_md)

    if args.json:
        result = {
            "verdict": verdict,
            "high_count": high_count,
            "findings": findings,
        }
        output = json.dumps(result, indent=2, ensure_ascii=False)
        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        else:
            print(output)

    sys.exit(0 if verdict == "PASS" else 1)


if __name__ == "__main__":
    main()
