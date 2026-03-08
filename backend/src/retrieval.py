from sentence_transformers import SentenceTransformer
import faiss


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def load_embedding_model():
    return SentenceTransformer(MODEL_NAME)


def build_faiss_index(sentences, model):
    if not sentences:
        return None, None

    embeddings = model.encode(sentences, convert_to_numpy=True)
    embeddings = embeddings.astype("float32")

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    return index, embeddings


def retrieve_top_k(query, sentences, model, index, k=5):
    if not query or not sentences or index is None:
        return []

    query_embedding = model.encode([query], convert_to_numpy=True).astype("float32")
    distances, indices = index.search(query_embedding, k)

    results = []
    for idx in indices[0]:
        if 0 <= idx < len(sentences):
            results.append(sentences[idx])

    return results