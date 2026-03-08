ENVIRONMENTAL_KEYWORDS = {
    "emissions", "carbon", "climate", "renewable", "energy", "water", "waste",
    "biodiversity", "recycling", "net zero", "solar", "wind", "diesel",
    "electricity", "fuel", "sustainability", "environment", "air", "pollution",
    "restored", "restoration", "decarbonization", "footprint", "natural"
}

SOCIAL_KEYWORDS = {
    "employees", "employee", "diversity", "inclusion", "community", "health",
    "safety", "training", "education", "human rights", "labor", "supplier",
    "suppliers", "jobs", "workplace", "women", "people", "communities",
    "headcount", "well-being", "worker", "workers"
}

GOVERNANCE_KEYWORDS = {
    "board", "ethics", "audit", "compliance", "governance", "policy",
    "transparency", "oversight", "regulation", "risk", "stakeholder",
    "stakeholders", "materiality", "controls", "committee", "disclosure",
    "reporting", "accountability"
}


def classify_esg_category(sentence: str):
    """
    Return ESG category plus matched keyword count.
    """
    text = sentence.lower()

    env_matches = [word for word in ENVIRONMENTAL_KEYWORDS if word in text]
    soc_matches = [word for word in SOCIAL_KEYWORDS if word in text]
    gov_matches = [word for word in GOVERNANCE_KEYWORDS if word in text]

    counts = {
        "Environmental": len(env_matches),
        "Social": len(soc_matches),
        "Governance": len(gov_matches),
    }

    best_category = max(counts, key=counts.get)

    if counts[best_category] == 0:
        return None, []

    matched_keywords = {
        "Environmental": env_matches,
        "Social": soc_matches,
        "Governance": gov_matches,
    }

    return best_category, matched_keywords[best_category]