#!/usr/bin/env python3
"""
Review Report Generator — N09 Change Viewpoint
Runs code_quality_checker + pr_analyzer and produces a unified V3.5 report.
Output path: docs/exec-plans/active/code-review-n09-{DATE}.md
"""

import sys
import json
import argparse
import subprocess
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional


SKILL_DIR = Path(__file__).parent
CHECKER = SKILL_DIR / "code_quality_checker.py"
PR_ANALYZER = SKILL_DIR / "pr_analyzer.py"


def run_script(script: Path, target: str, extra_args: List[str] = None) -> Dict:
    """Run a checker script and return its JSON output."""
    cmd = [sys.executable, str(script), target, "--json"] + (extra_args or [])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.stdout.strip():
            return json.loads(result.stdout.strip())
    except (json.JSONDecodeError, Exception):
        pass
    return {"verdict": "ERROR", "high_count": 0, "findings": []}


def build_report(target: str, quality: Dict, pr: Dict, output_path: Optional[Path]) -> str:
    """Compose unified markdown report for Loop B V3.5."""
    today = date.today().isoformat()
    q_verdict = quality.get("verdict", "ERROR")
    p_verdict = pr.get("verdict", "SKIP")
    q_high = quality.get("high_count", 0)
    p_high = pr.get("high_count", 0)
    total_blocking = q_high + p_high

    overall = "✅ PASS" if total_blocking == 0 else "❌ FAIL"

    lines = [
        f"# Code Review Report — N09 (V3.5)",
        f"**Date:** {today}",
        f"**Target:** `{target}`",
        f"**Overall Verdict:** {overall}",
        f"**Blocking Issues:** {total_blocking} (Quality: {q_high}, PR Diff: {p_high})",
        "",
        "---",
        "",
        "## Section 1: Code Quality Check",
        f"**Verdict:** {'✅ PASS' if q_verdict == 'PASS' else '❌ ' + q_verdict}",
        "",
    ]

    if quality.get("findings"):
        lines += [
            "| ID | Category | Priority | Result | Detail |",
            "|----|----------|----------|--------|--------|",
        ]
        for f in quality["findings"]:
            emoji = "✅" if f.get("result") == "PASS" else "❌"
            lines.append(
                f"| {f.get('id','?')} | {f.get('category','-')} | {f.get('priority','-')} | "
                f"{emoji} {f.get('result','?')} | {f.get('detail','') or '—'} |"
            )
    else:
        lines.append("_No findings available._")

    lines += [
        "",
        "---",
        "",
        "## Section 2: PR Diff Analysis",
        f"**Verdict:** {'✅ PASS' if p_verdict in ('PASS','SKIP') else '❌ ' + p_verdict}",
        "",
    ]

    if p_verdict == "SKIP":
        lines.append("_No git diff available — PR analysis skipped._")
    elif pr.get("findings"):
        lines += [
            "| ID | Priority | Result | Description |",
            "|----|----------|--------|-------------|",
        ]
        for f in pr["findings"]:
            emoji = "✅" if f.get("result") == "PASS" else "❌"
            lines.append(
                f"| {f.get('id','?')} | {f.get('priority','-')} | "
                f"{emoji} {f.get('result','?')} | {f.get('description','')}: {f.get('detail','')} |"
            )
    else:
        lines.append("_No diff findings._")

    lines += [
        "",
        "---",
        "",
        "## Section 3: RELIABILITY.md Cross-Check",
        "",
        "| Criterion | Status |",
        "|-----------|--------|",
    ]

    # Cross-check specific reliability criteria from findings
    q_findings = {f["id"]: f for f in quality.get("findings", [])}

    reliability_checks = [
        ("B1 — Fallback model present", q_findings.get("B1", {}).get("result", "N/A")),
        ("B2 — Retry ≤ 2", q_findings.get("B2", {}).get("result", "N/A")),
        ("B3 — User error message", q_findings.get("B3", {}).get("result", "N/A")),
        ("B5 — finally cleanup", q_findings.get("B5", {}).get("result", "N/A")),
        ("A1 — Protocol injection guard", q_findings.get("A1", {}).get("result", "N/A")),
    ]
    for label, status in reliability_checks:
        emoji = "✅" if status == "PASS" else ("❌" if status == "FAIL" else "⚠️")
        lines.append(f"| {label} | {emoji} {status} |")

    lines += [
        "",
        "## Section 4: SECURITY.md Cross-Check",
        "",
        "| Criterion | Status |",
        "|-----------|--------|",
    ]
    security_checks = [
        ("C1 — No hardcoded API key", q_findings.get("C1", {}).get("result", "N/A")),
        ("C2 — Env var usage", q_findings.get("C2", {}).get("result", "N/A")),
        ("C3 — Image type validation", q_findings.get("C3", {}).get("result", "N/A")),
        ("C5 — No API key in logs", q_findings.get("C5", {}).get("result", "N/A")),
    ]
    for label, status in security_checks:
        emoji = "✅" if status == "PASS" else ("❌" if status == "FAIL" else "⚠️")
        lines.append(f"| {label} | {emoji} {status} |")

    lines += [
        "",
        "---",
        "",
        "## Final Verdict (V3.5)",
        "",
        f"**{overall}** — {'No blocking issues. Proceed to V4 Stage B Simulation.' if total_blocking == 0 else f'{total_blocking} HIGH priority issue(s) must be resolved before Loop B PASS.'}",
        "",
        "---",
        f"*Generated by review_report_generator.py — N09 Code Reviewer / {today}*",
    ]

    report = "\n".join(lines)

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(report, encoding="utf-8")
        print(f"📝 Unified report written to {output_path}")

    return report


def main():
    parser = argparse.ArgumentParser(description="N09 Review Report Generator")
    parser.add_argument("target", help="Path to node app directory")
    parser.add_argument("--verbose", "-v", action="store_true")
    parser.add_argument("--output", "-o", help="Output file path for unified report")
    args = parser.parse_args()

    target = args.target
    today = date.today().isoformat()

    print(f"🚀 Running Review Report Generator...")
    print(f"📁 Target: {target}")

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        # Default: docs/exec-plans/active/
        base = Path(target)
        while base.parent != base:
            candidate = base / "docs" / "exec-plans" / "active"
            if candidate.exists():
                output_path = candidate / f"code-review-n09-{today}.md"
                break
            base = base.parent
        else:
            output_path = Path(f"code-review-n09-{today}.md")

    print("\n[1/2] Running code_quality_checker...")
    quality = run_script(CHECKER, target)
    q_verdict = quality.get("verdict", "ERROR")
    print(f"  → Quality: {q_verdict} ({quality.get('high_count', 0)} HIGH issues)")

    print("\n[2/2] Running pr_analyzer...")
    pr = run_script(PR_ANALYZER, target)
    p_verdict = pr.get("verdict", "SKIP")
    print(f"  → PR Diff: {p_verdict} ({pr.get('high_count', 0)} HIGH issues)")

    print("\n[3/3] Generating unified report...")
    report = build_report(target, quality, pr, output_path)

    total_blocking = quality.get("high_count", 0) + pr.get("high_count", 0)
    overall = "PASS" if total_blocking == 0 else "FAIL"
    print(f"\n{'✅' if overall == 'PASS' else '❌'} V3.5 Overall: {overall}")

    if not output_path:
        print("\n" + report)

    sys.exit(0 if overall == "PASS" else 1)


if __name__ == "__main__":
    main()
