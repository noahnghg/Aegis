from typing import TypedDict, Optional, List
from datetime import datetime, timedelta
from langgraph.graph import StateGraph, END
from app.tools.google_calendar import GoogleCalendarTool
from google.oauth2.credentials import Credentials

class SchedulerState(TypedDict):
    creds: Credentials
    start_time: datetime
    end_time: datetime
    summary: str
    conflict: bool
    suggested_slots: List[tuple[datetime, datetime]]
    message: str

class SchedulerAgent:
    def __init__(self):
        self.calendar_tool = GoogleCalendarTool()
        self.workflow = StateGraph(SchedulerState)
        
        self.workflow.add_node("check_conflicts", self.check_conflicts)
        self.workflow.add_node("suggest_slots", self.suggest_slots)
        
        self.workflow.set_entry_point("check_conflicts")
        
        self.workflow.add_conditional_edges(
            "check_conflicts",
            self.should_suggest,
            {
                "suggest": "suggest_slots",
                "end": END
            }
        )
        self.workflow.add_edge("suggest_slots", END)
        
        self.app = self.workflow.compile()

    def check_conflicts(self, state: SchedulerState):
        creds = state['creds']
        start = state['start_time']
        end = state['end_time']
        
        is_available = self.calendar_tool.check_availability(creds, start, end)
        
        if is_available:
            return {"conflict": False, "message": "Time slot is available."}
        else:
            return {"conflict": True, "message": "Conflict detected."}

    def should_suggest(self, state: SchedulerState):
        if state['conflict']:
            return "suggest"
        return "end"

    def suggest_slots(self, state: SchedulerState):
        # Simple logic: suggest the next available 1-hour slot after the conflict
        # In a real scenario, this would be more complex (checking multiple days, user preferences)
        creds = state['creds']
        original_start = state['start_time']
        duration = state['end_time'] - state['start_time']
        
        suggested = []
        # Check next 3 hours
        for i in range(1, 4):
            new_start = original_start + timedelta(hours=i)
            new_end = new_start + duration
            if self.calendar_tool.check_availability(creds, new_start, new_end):
                suggested.append((new_start, new_end))
                break # Just find the first one for now
        
        if suggested:
            msg = f"Conflict detected. Suggested alternative: {suggested[0][0].strftime('%H:%M')} - {suggested[0][1].strftime('%H:%M')}"
        else:
            msg = "Conflict detected. No immediate alternatives found."
            
        return {"suggested_slots": suggested, "message": msg}
