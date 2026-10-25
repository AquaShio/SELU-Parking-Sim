from app.services.map_loader import load_permits


def can_park(permit_type: str, lot_type: str) -> bool:
    config = load_permits()
    permits = config.get("permits", {})

    permit_info = permits.get(permit_type.lower())
    if not permit_info:
        # Default fallback
        return permit_type.lower() == lot_type.lower()

    allowed_lots = [lot.lower() for lot in permit_info.get("allowed_lots", [])]
    return lot_type.lower() in allowed_lots
