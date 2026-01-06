import chromadb
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.core import Settings
import os

# Ensure the data directory exists
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "chroma_db")
os.makedirs(DATA_DIR, exist_ok=True)

def get_vector_store():
    # Initialize ChromaDB persistent client
    db = chromadb.PersistentClient(path=DATA_DIR)
    
    # Get or create collection
    chroma_collection = db.get_or_create_collection("aegis_knowledge_base")
    
    # Create vector store
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    
    return vector_store

from llama_index.llms.gemini import Gemini
import google.generativeai as genai

def setup_embeddings():
    # Configure global settings to use Gemini embeddings and LLM
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
        genai.configure(api_key=api_key)
    
    # Set Embedding Model
    Settings.embedding_model = GeminiEmbedding(model_name="models/embedding-001", api_key=api_key)
    
    # Set LLM (to avoid OpenAI default)
    Settings.llm = Gemini(model="models/gemini-2.0-flash", api_key=api_key)

def get_index():
    vector_store = get_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    setup_embeddings()
    
    # Load index from storage
    return VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context,
        embed_model=Settings.embedding_model
    )
