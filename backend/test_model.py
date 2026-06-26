from dotenv import load_dotenv
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
import os

load_dotenv()

embed_model = GoogleGenAIEmbedding(
    model_name="gemini-embedding-001",
    api_key=os.getenv("GEMINI_API_KEY"),
    embed_batch_size=1
)

result = embed_model.get_text_embedding("hello world")

print(len(result))