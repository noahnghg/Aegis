from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
import os

# Load env vars before importing other modules that might use them
load_dotenv()
if os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

from app.tools.google_calendar import GoogleCalendarTool
from app.agents.scheduler import SchedulerAgent
from app.core.ingestion import DocumentProcessor
from app.agents.orchestrator import OrchestratorAgent
from app.agents.planner import PlannerAgent
from datetime import datetime
import uvicorn
import shutil
import uuid

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
calendar_tool = GoogleCalendarTool()
scheduler_agent = SchedulerAgent()
doc_processor = DocumentProcessor()
orchestrator_agent = OrchestratorAgent()
planner_agent = PlannerAgent()

# Simple in-memory storage for demo purposes
# In production, use a database or secure session storage
user_creds = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to Aegis LifeOS"}

@app.get("/auth/google")
def login_google():
    auth_url = calendar_tool.get_auth_url()
    return RedirectResponse(auth_url)

@app.get("/auth/callback")
def auth_callback(code: str):
    creds = calendar_tool.authenticate(code)
    # Store creds in memory (keyed by a simple ID for now, or just global)
    user_creds['default'] = creds
    return {"message": "Authentication successful! You can now use the scheduler."}

@app.post("/schedule/check")
def check_schedule(start_time: datetime, end_time: datetime, summary: str = "Study Session"):
    if 'default' not in user_creds:
        raise HTTPException(status_code=401, detail="User not authenticated. Go to /auth/google first.")
    
    creds = user_creds['default']
    
    initial_state = {
        "creds": creds,
        "start_time": start_time,
        "end_time": end_time,
        "summary": summary,
        "conflict": False,
        "suggested_slots": [],
        "message": ""
    }
    
    result = scheduler_agent.app.invoke(initial_state)
    
    return {
        "conflict": result['conflict'],
        "message": result['message'],
        "suggested_slots": result['suggested_slots']
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Create temp file
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process file
        num_chunks = doc_processor.process_pdf(temp_path)
        
        return {"message": f"Successfully processed {file.filename}", "chunks_created": num_chunks}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

from google.oauth2.credentials import Credentials

@app.post("/agent/run")
def run_agent(query: str, request: Request):
    creds = None
    
    # Check for Authorization header (Bearer token)
    auth_header = request.headers.get('Authorization')
    print(f"DEBUG: Auth Header: {auth_header}")
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print(f"DEBUG: Token extracted: {token[:10]}...")
        creds = Credentials(token=token)
        print(f"DEBUG: Creds created: {creds}")
    
    # Fallback to in-memory creds (for dev/testing via /auth/google)
    if not creds and 'default' in user_creds:
        print("DEBUG: Using in-memory creds")
        creds = user_creds['default']
        
    if not creds:
        print("DEBUG: No creds found")
        raise HTTPException(status_code=401, detail="User not authenticated. Please sign in.")
    
    # 1. Run Orchestrator to determine intent
    initial_orch_state = {
        "input_text": query,
        "intent": "unknown",
        "planner_state": {},
        "scheduler_state": {},
        "final_response": "",
        "creds": creds
    }
    orch_result = orchestrator_agent.app.invoke(initial_orch_state)
    
    if orch_result['intent'] == 'learn':
        # 2. Start Planner with a new thread
        thread_id = str(uuid.uuid4())
        topic = orch_result['planner_state']['topic']
        
        initial_planner_state = {
            "topic": topic,
            "hours_per_week": 5,
            "creds": creds,
            "research_summary": "",
            "roadmap": [],
            "scheduled_plan": [],
            "feedback": None,
            "approved": False
        }
        
        config = {"configurable": {"thread_id": thread_id}}
        
        # Invoke planner - it should pause before human_approval
        planner_result = planner_agent.app.invoke(initial_planner_state, config=config)
        
        # Check if we have a roadmap (paused state)
        # Note: invoke returns the final state of the run. If interrupted, it returns state at interruption.
        
        return {
            "intent": "learn",
            "thread_id": thread_id,
            "status": "paused", # Assuming it paused as expected
            "roadmap": planner_result.get('roadmap', []),
            "message": "Plan generated. Please review and approve or provide feedback."
        }
        
    elif orch_result['intent'] == 'schedule':
        # TODO: Implement Scheduler flow
        return {
            "intent": "schedule",
            "response": orch_result['final_response']
        }
    
    return {"intent": "unknown", "response": "Could not understand request."}

@app.post("/agent/feedback")
def agent_feedback(thread_id: str, action: str, request: Request, feedback: str = None):
    # action: "COMMIT" or "UPDATE"
    
    # We don't strictly need creds here for the planner update, but good to validate
    creds = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        creds = Credentials(token=token)
        
    if not creds and 'default' in user_creds:
        creds = user_creds['default']
        
    if not creds:
        raise HTTPException(status_code=401, detail="User not authenticated.")

    config = {"configurable": {"thread_id": thread_id}}
    
    if action == "COMMIT":
        planner_agent.app.update_state(config, {"approved": True})
        # Resume
        result = planner_agent.app.invoke(None, config=config)
        return {
            "status": "completed",
            "scheduled_plan": result.get('scheduled_plan', []),
            "message": "Plan approved and scheduled."
        }
        
    elif action == "UPDATE":
        planner_agent.app.update_state(config, {"feedback": feedback, "approved": False})
        # Resume - logic in graph will route back to generate_roadmap
        result = planner_agent.app.invoke(None, config=config)
        return {
            "status": "paused",
            "roadmap": result.get('roadmap', []),
            "message": "Plan updated based on feedback. Please review."
        }
        
    return {"error": "Invalid action"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
