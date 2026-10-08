import csv
import random
from pathlib import Path

random.seed(42)

OUTPUT_DIR = Path("data")
OUTPUT_DIR.mkdir(exist_ok=True)

TRAIN_SIZE = 5000
VAL_SIZE = 1000

def generate_row():
    claim_amount = random.uniform(5000, 500000)
    claim_age_days = random.randint(1, 60)
    previous_claims = random.randint(0, 5)
    policy_age_days = random.randint(30, 3000)
    evidence_count = random.randint(0, 6)

    # Create a realistic synthetic relationship between features and risk.
    risk_score = 0

    if claim_amount > 300000:
        risk_score += 2

    if claim_age_days <= 3:
        risk_score += 1

    if previous_claims >= 3:
        risk_score += 2

    if policy_age_days < 180:
        risk_score += 1

    if evidence_count == 0:
        risk_score += 2

    # Add some randomness so the model isn't perfectly deterministic.
    risk_score += random.choice([0, 0, 0, 1, -1])

    fraud = 1 if risk_score >= 4 else 0

    return [
        fraud,
        round(claim_amount, 2),
        claim_age_days,
        previous_claims,
        policy_age_days,
        evidence_count,
    ]


def generate_dataset(filename, size):
    path = OUTPUT_DIR / filename

    with open(path, "w", newline="") as f:
        writer = csv.writer(f)

        for _ in range(size):
            writer.writerow(generate_row())

    print(f"Created {path} with {size} rows")


generate_dataset("train.csv", TRAIN_SIZE)
generate_dataset("validation.csv", VAL_SIZE)