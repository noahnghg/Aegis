from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import TokenTextSplitter
from llama_index.core import VectorStoreIndex, StorageContext
from app.core.vector_store import get_vector_store, setup_embeddings
from llama_index.core import Settings

class DocumentProcessor:
    def __init__(self):
        setup_embeddings()
        self.vector_store = get_vector_store()
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        # 512 token chunk size, 10% overlap (approx 51 tokens)
        self.text_splitter = TokenTextSplitter(chunk_size=512, chunk_overlap=51)

    def process_pdf(self, file_path: str):
        # Load document
        # SimpleDirectoryReader is robust for loading single files too
        reader = SimpleDirectoryReader(input_files=[file_path])
        documents = reader.load_data()

        # Add metadata (filename is usually added by reader, but we ensure page info)
        # SimpleDirectoryReader adds 'file_name' and 'page_label' by default.
        
        # Parse nodes (chunking)
        nodes = self.text_splitter.get_nodes_from_documents(documents)
        
        # Create/Update Index
        # We use from_documents or insert_nodes. Since we want to persist to the existing store:
        index = VectorStoreIndex.from_vector_store(
            self.vector_store,
            storage_context=self.storage_context,
            embed_model=Settings.embedding_model
        )
        
        index.insert_nodes(nodes)
        
        return len(nodes)
