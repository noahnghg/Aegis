from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END
from llama_index.llms.gemini import Gemini
from llama_index.core import Settings
import json

class OrchestratorState(TypedDict):
    input_text: str
    intent: Literal["learn", "schedule", "unknown"]
    planner_state: dict
    scheduler_state: dict
    final_response: str
    creds: object

class OrchestratorAgent:
    def __init__(self):
        self.llm = Settings.llm
        
        self.workflow = StateGraph(OrchestratorState)
        
        self.workflow.add_node("classify_intent", self.classify_intent)
        self.workflow.add_node("run_planner", self.run_planner)
        self.workflow.add_node("run_scheduler", self.run_scheduler)
        
        self.workflow.set_entry_point("classify_intent")
        
        self.workflow.add_conditional_edges(
            "classify_intent",
            lambda x: x['intent'],
            {
                "learn": "run_planner",
                "schedule": "run_scheduler",
                "unknown": END
            }
        )
        
        self.workflow.add_edge("run_planner", END)
        self.workflow.add_edge("run_scheduler", END)
        
        self.app = self.workflow.compile()

    def classify_intent(self, state: OrchestratorState):
        print(f"Classifying intent for: {state['input_text']}")
        prompt = f"""
        Classify the following user input into one of these intents:
        - "learn": User wants to learn a topic, study something, or create a roadmap.
        - "schedule": User wants to check availability or schedule a specific meeting.
        - "unknown": Anything else.
        
        Input: "{state['input_text']}"
        
        Return ONLY the intent string.
        """
        response = self.llm.complete(prompt)
        intent = response.text.strip().lower()
        if intent not in ["learn", "schedule"]:
            intent = "unknown"
            
        print(f"Detected intent: {intent}")
        return {"intent": intent}

    def run_planner(self, state: OrchestratorState):
        print("Routing to Planner...")
        # Extract topic from input (simplistic extraction for now)
        topic = state['input_text'].replace("I want to learn", "").replace("about", "").strip()
        
        # We just return the intent and topic, letting the main app handle the stateful agent execution
        return {"intent": "learn", "final_response": f"Starting research on {topic}...", "planner_state": {"topic": topic}}

    def run_scheduler(self, state: OrchestratorState):
        print("Routing to Scheduler...")
        return {"intent": "schedule", "final_response": "Scheduler logic triggered."}
