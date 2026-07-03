from datetime import date

def is_date_weekly_off(check_date: date, policy_rules: dict) -> bool:
    
    day_index = str(check_date.weekday())

    if day_index not in policy_rules:
        return False

    rule = policy_rules[day_index]
    
    if rule == "all":
        return True

    week_occurrence = (check_date.day - 1) // 7 + 1

    return week_occurrence in rule