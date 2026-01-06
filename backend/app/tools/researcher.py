from app.core.vector_store import get_index, setup_embeddings
from llama_index.core.base.base_query_engine import BaseQueryEngine

class ResearcherTool:
    def __init__(self):
        # Ensure embeddings are setup
        setup_embeddings()
        self.index = get_index()
        self.query_engine = self.index.as_query_engine()

    def research(self, query: str) -> str:
        """
        Queries the knowledge base for the given topic.
        """
        response = self.query_engine.query(query)
        return str(response)
