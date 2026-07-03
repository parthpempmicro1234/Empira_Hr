# def is_week_off(employee, date):
#     org = getattr(employee, 'employeeorganization', None)

#     if not org or not org.business_unit:
#         return False

#     policy = org.business_unit.weekly_off_policy

#     if not policy:
#         return False

#     day_name = date.strftime('%A').lower()

#     return day_name in policy.off_days


# def is_week_off(employee, date):
#     org = getattr(employee, 'employeeorganization', None)

#     if not org or not org.business_unit:
#         return False

#     # FIX: Use .all() to read from the prefetch cache in memory! (Zero DB Queries)
#     policies = org.business_unit.weekly_off_policies.all()

#     if not policies:
#         return False

#     # Grab the first policy in the list 
#     policy = policies[0] 

#     # --- IMPORTANT WARNING based on your new model ---
#     # I noticed your new model uses `policy_rules` (e.g., {'6': 'all'}) 
#     # instead of the old `off_days` list (e.g., ["Saturday", "Sunday"]).
#     # 
#     # If you are still using the old logic, you must update it to read your new JSON format!
    
#     day_index = str(date.weekday()) # 0=Monday, 6=Sunday
    
#     # Example logic for your new JSON format:
#     rules = policy.policy_rules
#     if day_index in rules and rules[day_index] == 'all':
#         return True
        
#     return False

def is_week_off(target_date, policy_rules):

    if not policy_rules:
        return False

    weekday_str = str(target_date.weekday())
    if weekday_str not in policy_rules:
        return False
        
    rule = policy_rules[weekday_str]
    
    if rule == "all":
        return True
        
    if isinstance(rule, list):
        occurrence_in_month = ((target_date.day - 1) // 7) + 1
        return occurrence_in_month in rule
        
    return False

def calculate_time_percentage(avg_timedelta, target_hours=8, target_minutes=30):

    if not avg_timedelta:
        return 0.0
        
    target_seconds = (target_hours * 3600) + (target_minutes * 60)
    avg_seconds = avg_timedelta.total_seconds()
    
    percentage = (avg_seconds / target_seconds) 
    
    return min(round(percentage, 2), 100.0)