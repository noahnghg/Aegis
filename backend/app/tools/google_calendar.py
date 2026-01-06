from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.core.config import settings
import datetime

class GoogleCalendarTool:
    def __init__(self):
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
        self.client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

    def get_auth_url(self):
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        auth_url, _ = flow.authorization_url(prompt='consent')
        return auth_url

    def authenticate(self, code: str):
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        return creds

    def list_events(self, creds: Credentials, start_time: datetime.datetime, end_time: datetime.datetime):
        service = build('calendar', 'v3', credentials=creds)
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_time.isoformat() + 'Z',
            timeMax=end_time.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        return events_result.get('items', [])

    def check_availability(self, creds: Credentials, start_time: datetime.datetime, end_time: datetime.datetime):
        events = self.list_events(creds, start_time, end_time)
        return len(events) == 0

    def create_event(self, creds: Credentials, summary: str, start_time: datetime.datetime, end_time: datetime.datetime):
        service = build('calendar', 'v3', credentials=creds)
        event = {
            'summary': summary,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            },
        }
        event = service.events().insert(calendarId='primary', body=event).execute()
        return event
