# Aegis LifeOS

Aegis LifeOS is an intelligent agent system designed to plan and schedule learning goals directly into your Google Calendar. It uses a multi-agent architecture to understand user intents, create detailed learning roadmaps, and find available time slots without conflicts.

## Key Features

- **Multi-Agent Orchestration**: Specialized agents handle planning, scheduling, and general coordination.
- **Smart Scheduling**: Integrates with Google Calendar to detect conflicts and book sessions.
- **Learning Plans**: Generates curriculum roadmaps for specific topics (e.g., "Learn Python").
- **Knowledge Base**: Basic RAG capabilities for answering questions from uploaded PDFs.
- **Google Calendar Add-on**: Interact with Aegis directly from your calendar sidebar.

## Architecture

The system consists of two main components:
1.  **Frontend/Client**:
    - Next.js web application for chat and visualization.
    - Google Apps Script Add-on for calendar sidebar integration.
2.  **Backend**:
    - FastAPI server handling agent logic.
    - LangGraph for state management.
    - LlamaIndex for document retrieval.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Google Cloud Console Project (for OAuth & Calendar API)
- Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/noahnghg/Aegis.git
    cd Aegis
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
    Create a `.env` file in the `backend/` directory:
    ```env
    GEMINI_API_KEY=your_key_here
    ```

3.  **Frontend Setup**
    ```bash
    cd ../client
    npm install
    ```

4.  **Run the Application**
    *Terminal 1 (Backend):*
    ```bash
    cd backend
    uvicorn app.main:app --reload
    ```
    *Terminal 2 (Frontend):*
    ```bash
    cd client
    npm run dev
    ```

    Open http://localhost:3000 to use the web interface.

## Google Calendar Integration

To use the Google Calendar features, you need to set up a Google Cloud Project and deploy the Google Apps Script add-on.

### 1. Google Cloud Setup
1.  Go to the Google Cloud Console.
2.  Create a new project or select an existing one.
3.  Enable the **Google Calendar API**.
4.  Configure the OAuth Consent Screen (External or Internal depending on your workspace).
5.  Create **OAuth Client ID** credentials:
    - Application Type: **Desktop App**.
    - Download the JSON file and save it as `credentials.json` in the `backend/` directory.

### 2. Google Apps Script Deployment
The sidebar interface lives in Google Calendar via Google Apps Script.

1.  Go to [script.google.com](https://script.google.com) and create a **New Project**.
2.  **Code.gs**: Copy the contents of `google_apps_script/Code.gs` from this repository into the script editor's strictly named `Code.gs` file.
3.  **appsscript.json**:
    - In the editor settings (gear icon), enable "Show 'appsscript.json' manifest file in editor".
    - Copy the contents of `google_apps_script/appsscript.json` into the editor's `appsscript.json` file.
4.  **Backend URL Configuration**:
    - If running locally, you must expose your backend (port 8000) to the internet using a tool like **ngrok**.
    - Copy your public ngrok URL (e.g., `https://xyz.ngrok-free.app`).
    - Update the `BASE_URL` variable in `Code.gs` with this URL.
5.  **Deploy**:
    - Click **Deploy** -> **Test deployments**.
    - Select **Google Workspace Add-on**.
    - Click **Install**.
6.  Open Google Calendar. You should see the Aegis icon in the right-hand sidebar.
