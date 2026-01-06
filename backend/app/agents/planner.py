from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from app.tools.google_calendar import GoogleCalendarTool
from app.tools.researcher import ResearcherTool
from datetime import datetime, timedelta
from llama_index.llms.gemini import Gemini
from llama_index.core import Settings
import json
import re

class PlannerState(TypedDict):
    topic: str
    hours_per_week: int
    research_summary: str
    roadmap: List[dict] # List of {topic, duration_hours}
    scheduled_plan: List[dict] # List of {topic, start, end}
    creds: object # Google Credentials
    feedback: Optional[str]
    approved: bool

class PlannerAgent:
    def __init__(self):
        self.researcher = ResearcherTool()
        self.calendar = GoogleCalendarTool()
        self.llm = Settings.llm # Use the configured Gemini LLM
        self.checkpointer = MemorySaver()
        
        self.workflow = StateGraph(PlannerState)
        
        self.workflow.add_node("research_topic", self.research_topic)
        self.workflow.add_node("generate_roadmap", self.generate_roadmap)
        self.workflow.add_node("human_approval", self.human_approval)
        self.workflow.add_node("schedule_roadmap", self.schedule_roadmap)
        
        self.workflow.set_entry_point("research_topic")
        
        self.workflow.add_edge("research_topic", "generate_roadmap")
        self.workflow.add_edge("generate_roadmap", "human_approval")
        
        self.workflow.add_conditional_edges(
            "human_approval",
            self.check_approval,
            {
                "approved": "schedule_roadmap",
                "feedback": "generate_roadmap",
                "wait": END # Should not happen if interrupted correctly
            }
        )
        
        self.workflow.add_edge("schedule_roadmap", END)
        
        # Interrupt before human_approval to allow user input
        self.app = self.workflow.compile(checkpointer=self.checkpointer, interrupt_before=["human_approval"])

    def research_topic(self, state: PlannerState):
        print(f"Researching topic: {state['topic']}")
        summary = self.researcher.research(f"Provide a comprehensive summary and key sub-topics for learning: {state['topic']}")
        return {"research_summary": summary}

    def generate_roadmap(self, state: PlannerState):
        print("Generating roadmap...")
        
        feedback_context = ""
        if state.get('feedback'):
            feedback_context = f"\nUSER FEEDBACK ON PREVIOUS PLAN: {state['feedback']}\nAdjust the plan accordingly."
            
        prompt = f"""
        Based on the following research summary, create a study roadmap for '{state['topic']}'.
        The user has {state['hours_per_week']} hours per week available.
        {feedback_context}
        
        Research Summary:
        {state['research_summary']}
        
        Return a JSON list of objects, where each object has:
        - "topic": string (sub-topic name)
        - "duration_hours": int (estimated time to learn)
        
        Example format:
        [
            {{"topic": "Introduction", "duration_hours": 2}},
            {{"topic": "Advanced Concepts", "duration_hours": 5}}
        ]
        
        Return ONLY the JSON.
        """
        response = self.llm.complete(prompt)
        text = response.text
        
        # Clean up code blocks if present
        text = re.sub(r"```json", "", text)
        text = re.sub(r"```", "", text)
        
        try:
            roadmap = json.loads(text.strip())
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {text}")
            roadmap = []
            
        return {"roadmap": roadmap, "feedback": None} # Clear feedback after usage

    def human_approval(self, state: PlannerState):
        # This node is just a placeholder to be interrupted before
        # When resumed, it checks the state
        pass

    def check_approval(self, state: PlannerState):
        if state.get('approved'):
            return "approved"
        elif state.get('feedback'):
            return "feedback"
        return "wait"

    def schedule_roadmap(self, state: PlannerState):
        print("Scheduling roadmap...")
        roadmap = state['roadmap']
        creds = state['creds']
        
        scheduled_plan = []
        current_date = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        
        # Simple greedy scheduler: find first available slot in next 7 days
        # Working hours assumed: 9am - 9pm
        
        for item in roadmap:
            duration = item['duration_hours']
            topic = item['topic']
            
            # Find a slot
            slot_found = False
            search_start = current_date
            
            while not slot_found:
                # Check if within working hours (simple check)
                if search_start.hour < 9:
                    search_start = search_start.replace(hour=9)
                if search_start.hour + duration > 21:
                    # Move to next day
                    search_start = search_start + timedelta(days=1)
                    search_start = search_start.replace(hour=9)
                    continue
                
                search_end = search_start + timedelta(hours=duration)
                
                if self.calendar.check_availability(creds, search_start, search_end):
                    # Book it (conceptually, or actually create event if desired)
                    # For now, we just add to plan
                    scheduled_plan.append({
                        "topic": topic,
                        "start": search_start.isoformat(),
                        "end": search_end.isoformat()
                    })
                    
                    # Create actual event
                    self.calendar.create_event(creds, f"Study: {topic}", search_start, search_end)
                    
                    slot_found = True
                    current_date = search_end + timedelta(minutes=15) # Buffer
                else:
                    search_start += timedelta(hours=1)
                    
                # Safety break to avoid infinite loop
                if search_start > datetime.now() + timedelta(days=30):
                    print("Could not find slot within 30 days")
                    break
                    
        return {"scheduled_plan": scheduled_plan}
