from datetime import datetime, timedelta

def parse_date_range(range_str: str, from_date: str = None, to_date: str = None):
    """
    Parses a date range string and returns current period and previous period datetime boundaries.
    Time defaults to UTC.
    Supported ranges: '7d', '30d', '90d', 'custom'
    Returns: Tuple of (start_date, end_date, prev_start_date, prev_end_date)
    """
    end_date = datetime.utcnow()
    
    if range_str == "custom" and from_date and to_date:
        try:
            start_date = datetime.strptime(from_date, "%Y-%m-%d")
            end_date = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            delta = end_date - start_date
            prev_end_date = start_date - timedelta(seconds=1)
            prev_start_date = prev_end_date - delta
            return start_date, end_date, prev_start_date, prev_end_date
        except ValueError:
            # Fallback to 30d if invalid format
            range_str = "30d"
            
    if range_str == "7d":
        days = 7
    elif range_str == "90d":
        days = 90
    else:
        days = 30 # Default 30d

    start_date = end_date - timedelta(days=days)
    prev_end_date = start_date - timedelta(seconds=1)
    prev_start_date = prev_end_date - timedelta(days=days)

    return start_date, end_date, prev_start_date, prev_end_date

def calculate_trend(current_val, prev_val):
    """Calculates percentage change, safely handling zero divisions."""
    if not prev_val or prev_val == 0:
        return 100.0 if current_val > 0 else 0.0
    return round(((current_val - prev_val) / prev_val) * 100, 2)
