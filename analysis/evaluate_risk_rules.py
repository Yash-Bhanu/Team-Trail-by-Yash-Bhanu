"""
TeamTrail Synthetic Validation & Threshold Sensitivity Analysis
Note: All data generated/analyzed here is SYNTHETIC for methodology validation.
No real student data or pilot study results are claimed.
"""
import json
from dataclasses import dataclass
from typing import List, Dict
import math

@dataclass
class SyntheticTeamSample:
    team_id: str
    mentor_needs_intervention: bool
    days_since_activity: int
    days_since_merge: int
    top_contributor_share: float
    total_events: int
    is_blocked: bool
    missing_checkins: int
    data_coverage: str


def predict_flag(sample: SyntheticTeamSample, inactivity_days: int = 7, imbalance_thresh: float = 0.80) -> bool:
    if sample.data_coverage in ("none", "minimal"):
        return False
    if sample.days_since_activity >= inactivity_days:
        return True
    if sample.days_since_merge >= 8:
        return True
    if sample.total_events >= 10 and sample.top_contributor_share >= imbalance_thresh:
        return True
    if sample.is_blocked or sample.missing_checkins >= 2:
        return True
    return False


def evaluate_metrics(samples: List[SyntheticTeamSample], inactivity_days: int = 7, imbalance_thresh: float = 0.80) -> Dict[str, float]:
    tp = fp = fn = tn = 0
    for s in samples:
        pred = predict_flag(s, inactivity_days, imbalance_thresh)
        if pred and s.mentor_needs_intervention:
            tp += 1
        elif pred and not s.mentor_needs_intervention:
            fp += 1
        elif not pred and s.mentor_needs_intervention:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)}


if __name__ == "__main__":
    synthetic_cohort = [
        SyntheticTeamSample("T1", False, 1, 2, 0.30, 45, False, 0, "full"),
        SyntheticTeamSample("T2", True, 9, 10, 0.40, 20, True, 2, "full"),
        SyntheticTeamSample("T3", True, 1, 2, 0.85, 61, False, 0, "full"),
        SyntheticTeamSample("T4", False, 3, 4, 0.55, 30, False, 1, "full"),
        SyntheticTeamSample("T5", True, 14, 14, 0.50, 12, False, 3, "partial"),
        SyntheticTeamSample("T6", False, 8, 9, 0.40, 15, False, 0, "minimal"),  # Guarded by coverage
    ]
    print("Synthetic Baseline (inactivity=7d, imbalance=0.80):", json.dumps(evaluate_metrics(synthetic_cohort, 7, 0.80), indent=2))
    print("Sensitivity (inactivity=5d, imbalance=0.75):", json.dumps(evaluate_metrics(synthetic_cohort, 5, 0.75), indent=2))
