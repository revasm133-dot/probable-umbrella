from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import numpy as np
from scipy import stats
import json
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class ChatMessageCreate(BaseModel):
    session_id: str
    message: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Sesi Baru"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReferenceCreate(BaseModel):
    title: str
    authors: str
    year: int
    journal: str
    doi: Optional[str] = ""
    abstract: Optional[str] = ""
    keywords: Optional[str] = ""
    notes: Optional[str] = ""

class Reference(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    authors: str
    year: int
    journal: str
    doi: str = ""
    abstract: str = ""
    keywords: str = ""
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StatisticalInput(BaseModel):
    data: Dict[str, List[float]]  # {"F1": [val1, val2...], "F2": [...], "F3": [...]}
    parameter_name: str = "Parameter"
    alpha: float = 0.05

class StatisticalResult(BaseModel):
    parameter_name: str
    anova: Dict[str, Any]
    dmrt: Optional[Dict[str, Any]] = None
    descriptive: Dict[str, Any]

class WritingRequest(BaseModel):
    text: str
    mode: str  # "paraphrase", "formal", "review", "suggest"
    context: Optional[str] = ""

# ===================== SYSTEM PROMPT =====================

SYSTEM_PROMPT = """Anda adalah Dosen Pembimbing AI (Asisten Ilmiah) untuk mahasiswa bernama Reva yang sedang mengerjakan skripsi S1 Nutrisi (konsentrasi Teknologi Pangan).

Judul Skripsi: "Analisis Fisikokimia Bubur Instan yang Difortifikasi dengan Daun Pegagan (Centella asiatica) sebagai Pangan Darurat Bencana"

Deskripsi Produk: Bubur instan berbahan dasar pangan lokal Indonesia, difortifikasi dengan daun pegagan (Centella asiatica), dirancang khusus sebagai pangan darurat bencana. Rasa: Savory.
Formulasi: 3 perlakuan dengan konsentrasi Centella asiatica berbeda:
- F1: 5%
- F2: 10%
- F3: 15%

Parameter Penelitian:
1. Analisis fisikokimia (meliputi: analisis proksimat, aktivitas air/Aw, kapasitas rehidrasi, dan parameter fisikokimia relevan lainnya)
2. Uji organoleptik / uji penerimaan (uji penerimaan panelis)
Catatan: Uji umur simpan TIDAK termasuk parameter (sudah direvisi).

Desain Penelitian: RCT (Randomized Controlled Trial)
Analisis statistik: ANOVA, dilanjutkan uji DMRT jika ditemukan perbedaan signifikan antar perlakuan.

Aturan penulisan:
- Gaya akademik formal, konsisten dengan konvensi akademik Indonesia
- Mulai respons dengan jawaban langsung — tanpa basa-basi
- Hindari klise: "perlu dicatat bahwa," "penting untuk diperhatikan," "dalam rangka"
- Variasikan panjang dan struktur kalimat; hindari tulisan mekanik atau datar
- Verifikasi klaim dan statistik sebelum menyajikan; jika ragu, nyatakan singkat ketidakpastian

Tugas Anda:
1. Bertindak sebagai dosen pembimbing ilmiah yang membimbing proses penelitian
2. Membantu penulisan akademik dalam Bahasa Indonesia formal
3. Memberikan saran metodologi penelitian
4. Membantu analisis dan interpretasi data
5. Memberikan masukan pada tinjauan pustaka
6. Menjawab pertanyaan terkait teknologi pangan, nutrisi, dan Centella asiatica

Selalu jawab dalam Bahasa Indonesia kecuali diminta sebaliknya."""

# ===================== AI CHAT ENDPOINTS =====================

# Store active LlmChat instances
chat_instances: Dict[str, LlmChat] = {}

def get_chat_instance(session_id: str) -> LlmChat:
    if session_id not in chat_instances:
        chat_instances[session_id] = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=SYSTEM_PROMPT
        ).with_model("anthropic", "claude-opus-4-6")
    return chat_instances[session_id]

@api_router.get("/")
async def root():
    return {"message": "Asisten Penelitian AI - Backend Active"}

@api_router.post("/chat/sessions", response_model=ChatSession)
async def create_chat_session():
    session = ChatSession()
    doc = session.model_dump()
    await db.chat_sessions.insert_one(doc)
    return session

@api_router.get("/chat/sessions", response_model=List[ChatSession])
async def get_chat_sessions():
    sessions = await db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return sessions

@api_router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    await db.chat_sessions.delete_one({"id": session_id})
    await db.chat_messages.delete_many({"session_id": session_id})
    if session_id in chat_instances:
        del chat_instances[session_id]
    return {"status": "deleted"}

@api_router.get("/chat/messages/{session_id}", response_model=List[ChatMessage])
async def get_chat_messages(session_id: str):
    messages = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    return messages

@api_router.post("/chat/send", response_model=ChatMessage)
async def send_chat_message(input: ChatMessageCreate):
    # Save user message
    user_msg = ChatMessage(
        session_id=input.session_id,
        role="user",
        content=input.message
    )
    await db.chat_messages.insert_one(user_msg.model_dump())

    # Get AI response
    try:
        chat = get_chat_instance(input.session_id)
        
        # Load history into chat instance if it's fresh
        history = await db.chat_messages.find(
            {"session_id": input.session_id, "role": {"$in": ["user", "assistant"]}},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(100)
        
        user_message = UserMessage(text=input.message)
        response_text = await chat.send_message(user_message)

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=input.session_id,
            role="assistant",
            content=response_text
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())

        # Update session title if first message
        msg_count = await db.chat_messages.count_documents({"session_id": input.session_id})
        if msg_count <= 2:
            title = input.message[:50] + ("..." if len(input.message) > 50 else "")
            await db.chat_sessions.update_one(
                {"id": input.session_id},
                {"$set": {"title": title, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.chat_sessions.update_one(
                {"id": input.session_id},
                {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )

        return assistant_msg
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        error_msg = ChatMessage(
            session_id=input.session_id,
            role="assistant",
            content=f"Maaf, terjadi kesalahan saat memproses pesan. Silakan coba lagi. Error: {str(e)}"
        )
        await db.chat_messages.insert_one(error_msg.model_dump())
        return error_msg

# ===================== WRITING ASSISTANT =====================

@api_router.post("/writing/assist")
async def writing_assist(input: WritingRequest):
    mode_prompts = {
        "paraphrase": f"Parafrase teks berikut dalam Bahasa Indonesia akademik formal tanpa mengubah makna:\n\n{input.text}",
        "formal": f"Ubah teks berikut menjadi gaya akademik formal Bahasa Indonesia yang sesuai dengan konvensi penulisan skripsi:\n\n{input.text}",
        "review": f"Berikan review akademik untuk teks berikut. Identifikasi kekuatan, kelemahan, dan saran perbaikan:\n\n{input.text}",
        "suggest": f"Berdasarkan konteks penelitian tentang bubur instan daun pegagan, lanjutkan atau kembangkan paragraf berikut:\n\n{input.text}"
    }

    prompt = mode_prompts.get(input.mode, mode_prompts["formal"])
    if input.context:
        prompt += f"\n\nKonteks tambahan: {input.context}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"writing-{str(uuid.uuid4())}",
            system_message="Anda adalah editor akademik ahli dalam penulisan skripsi Bahasa Indonesia. Tugas Anda adalah membantu memperbaiki, memparafrase, dan mengembangkan tulisan akademik."
        ).with_model("anthropic", "claude-opus-4-6")

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return {"result": response, "mode": input.mode}
    except Exception as e:
        logger.error(f"Writing assist error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================== STATISTICAL CALCULATOR =====================

@api_router.post("/statistics/calculate", response_model=StatisticalResult)
async def calculate_statistics(input: StatisticalInput):
    try:
        groups = input.data
        group_names = list(groups.keys())
        group_values = list(groups.values())

        # Descriptive statistics
        descriptive = {}
        for name, values in groups.items():
            arr = np.array(values, dtype=float)
            descriptive[name] = {
                "mean": round(float(np.mean(arr)), 4),
                "std": round(float(np.std(arr, ddof=1)), 4),
                "min": round(float(np.min(arr)), 4),
                "max": round(float(np.max(arr)), 4),
                "n": len(values)
            }

        # One-way ANOVA
        f_stat, p_value = stats.f_oneway(*group_values)
        anova_result = {
            "f_statistic": round(float(f_stat), 4),
            "p_value": round(float(p_value), 6),
            "significant": bool(p_value < input.alpha),  # Convert numpy.bool to Python bool
            "alpha": input.alpha
        }

        # DMRT if significant
        dmrt_result = None
        if p_value < input.alpha:
            dmrt_result = perform_dmrt(groups, input.alpha)

        return StatisticalResult(
            parameter_name=input.parameter_name,
            anova=anova_result,
            dmrt=dmrt_result,
            descriptive=descriptive
        )
    except Exception as e:
        logger.error(f"Statistics error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Kesalahan kalkulasi: {str(e)}")


def perform_dmrt(groups: Dict[str, List[float]], alpha: float = 0.05) -> Dict[str, Any]:
    """Perform Duncan's Multiple Range Test"""
    group_names = list(groups.keys())
    group_values = list(groups.values())

    # Calculate MSE and df
    all_values = []
    for v in group_values:
        all_values.extend(v)

    k = len(group_names)
    N = len(all_values)
    grand_mean = np.mean(all_values)

    # Within-group SS
    ss_within = sum(sum((x - np.mean(vals))**2 for x in vals) for vals in group_values)
    df_within = N - k
    mse = ss_within / df_within if df_within > 0 else 0

    # Sort groups by mean
    means = [(name, np.mean(vals)) for name, vals in groups.items()]
    means.sort(key=lambda x: x[1], reverse=True)

    # Calculate SE
    n_per_group = len(group_values[0])  # assumes equal n
    se = np.sqrt(mse / n_per_group) if n_per_group > 0 else 0

    # Assign groups (simplified DMRT grouping)
    groupings = {}
    current_group = 'a'
    groupings[means[0][0]] = current_group

    for i in range(1, len(means)):
        diff = abs(means[i-1][1] - means[i][1])
        # Critical value approximation using studentized range
        q_crit = stats.t.ppf(1 - alpha/2, df_within) * np.sqrt(2)
        critical_range = q_crit * se

        if diff > critical_range:
            current_group = chr(ord(current_group) + 1)
        groupings[means[i][0]] = current_group

    return {
        "mse": round(float(mse), 4),
        "df_within": int(df_within),
        "se": round(float(se), 4),
        "ranked_means": [{"group": name, "mean": round(float(m), 4), "dmrt_group": groupings[name]} for name, m in means],
        "groupings": groupings
    }

# ===================== REFERENCE MANAGER =====================

@api_router.post("/references", response_model=Reference)
async def create_reference(input: ReferenceCreate):
    ref = Reference(**input.model_dump())
    await db.references.insert_one(ref.model_dump())
    return ref

@api_router.get("/references", response_model=List[Reference])
async def get_references():
    refs = await db.references.find({}, {"_id": 0}).sort("year", -1).to_list(200)
    return refs

@api_router.delete("/references/{ref_id}")
async def delete_reference(ref_id: str):
    result = await db.references.delete_one({"id": ref_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Referensi tidak ditemukan")
    return {"status": "deleted"}

@api_router.put("/references/{ref_id}", response_model=Reference)
async def update_reference(ref_id: str, input: ReferenceCreate):
    update_data = input.model_dump()
    result = await db.references.update_one({"id": ref_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Referensi tidak ditemukan")
    updated = await db.references.find_one({"id": ref_id}, {"_id": 0})
    return updated

# ===================== RESEARCH DATA =====================

class ResearchDataCreate(BaseModel):
    parameter: str  # e.g., "Kadar Air", "Kadar Abu"
    unit: str = "%"
    data: Dict[str, List[float]]  # {"F1": [...], "F2": [...], "F3": [...]}

class ResearchData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parameter: str
    unit: str = "%"
    data: Dict[str, List[float]]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.post("/research-data", response_model=ResearchData)
async def create_research_data(input: ResearchDataCreate):
    data = ResearchData(**input.model_dump())
    await db.research_data.insert_one(data.model_dump())
    return data

@api_router.get("/research-data", response_model=List[ResearchData])
async def get_research_data():
    data = await db.research_data.find({}, {"_id": 0}).to_list(100)
    return data

@api_router.delete("/research-data/{data_id}")
async def delete_research_data(data_id: str):
    await db.research_data.delete_one({"id": data_id})
    return {"status": "deleted"}

# ===================== WRITING TEMPLATES =====================

@api_router.get("/templates")
async def get_writing_templates():
    templates = [
        {
            "id": "latar-belakang",
            "title": "Latar Belakang",
            "description": "Template pendahuluan dengan pendekatan funnel",
            "structure": [
                "Paragraf 1: Konteks umum (bencana alam di Indonesia)",
                "Paragraf 2: Permasalahan pangan darurat",
                "Paragraf 3: Solusi potensial (bubur instan)",
                "Paragraf 4: Fortifikasi dengan bahan lokal",
                "Paragraf 5: Centella asiatica dan manfaatnya",
                "Paragraf 6: Gap penelitian dan urgensi",
                "Paragraf 7: Tujuan penelitian"
            ]
        },
        {
            "id": "tinjauan-pustaka",
            "title": "Tinjauan Pustaka",
            "description": "Kerangka tinjauan literatur",
            "structure": [
                "2.1 Pangan Darurat Bencana",
                "2.2 Bubur Instan",
                "2.3 Centella asiatica (Pegagan)",
                "2.4 Analisis Fisikokimia",
                "2.5 Analisis Proksimat",
                "2.6 Uji Organoleptik",
                "2.7 Kerangka Pemikiran"
            ]
        },
        {
            "id": "metodologi",
            "title": "Metodologi Penelitian",
            "description": "Template bab metode penelitian",
            "structure": [
                "3.1 Waktu dan Tempat Penelitian",
                "3.2 Bahan dan Alat",
                "3.3 Rancangan Penelitian (RCT)",
                "3.4 Prosedur Penelitian",
                "3.5 Parameter Pengamatan",
                "3.6 Analisis Data (ANOVA + DMRT)"
            ]
        },
        {
            "id": "hasil-pembahasan",
            "title": "Hasil dan Pembahasan",
            "description": "Template penulisan hasil",
            "structure": [
                "4.1 Analisis Proksimat",
                "4.2 Aktivitas Air (Aw)",
                "4.3 Kapasitas Rehidrasi",
                "4.4 Uji Organoleptik",
                "4.5 Pembahasan Umum"
            ]
        }
    ]
    return templates

# ===================== PROGRESS TRACKER =====================

class ChapterProgressCreate(BaseModel):
    chapter_id: str
    title: str
    target_pages: int = 0
    subtasks: List[Dict[str, Any]] = []  # [{"title": "...", "completed": false}]

class ChapterProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chapter_id: str
    title: str
    target_pages: int = 0
    current_pages: int = 0
    status: str = "belum_mulai"  # belum_mulai, sedang_dikerjakan, revisi, selesai
    subtasks: List[Dict[str, Any]] = []
    notes: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChapterProgressUpdate(BaseModel):
    title: Optional[str] = None
    target_pages: Optional[int] = None
    current_pages: Optional[int] = None
    status: Optional[str] = None
    subtasks: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

@api_router.post("/progress", response_model=ChapterProgress)
async def create_chapter_progress(input: ChapterProgressCreate):
    chapter = ChapterProgress(**input.model_dump())
    await db.progress.insert_one(chapter.model_dump())
    return chapter

@api_router.get("/progress", response_model=List[ChapterProgress])
async def get_all_progress():
    chapters = await db.progress.find({}, {"_id": 0}).sort("chapter_id", 1).to_list(50)
    return chapters

@api_router.put("/progress/{chapter_db_id}", response_model=ChapterProgress)
async def update_chapter_progress(chapter_db_id: str, input: ChapterProgressUpdate):
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.progress.update_one({"id": chapter_db_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bab tidak ditemukan")
    updated = await db.progress.find_one({"id": chapter_db_id}, {"_id": 0})
    return updated

@api_router.delete("/progress/{chapter_db_id}")
async def delete_chapter_progress(chapter_db_id: str):
    await db.progress.delete_one({"id": chapter_db_id})
    return {"status": "deleted"}

@api_router.post("/progress/seed")
async def seed_progress():
    """Seed default thesis chapters if none exist"""
    existing = await db.progress.count_documents({})
    if existing > 0:
        return {"status": "already_seeded", "count": existing}
    
    default_chapters = [
        {"chapter_id": "bab-1", "title": "Bab I - Pendahuluan", "target_pages": 8, "subtasks": [
            {"title": "Latar Belakang", "completed": False},
            {"title": "Rumusan Masalah", "completed": False},
            {"title": "Tujuan Penelitian", "completed": False},
            {"title": "Manfaat Penelitian", "completed": False},
        ]},
        {"chapter_id": "bab-2", "title": "Bab II - Tinjauan Pustaka", "target_pages": 20, "subtasks": [
            {"title": "Pangan Darurat Bencana", "completed": False},
            {"title": "Bubur Instan", "completed": False},
            {"title": "Centella asiatica (Pegagan)", "completed": False},
            {"title": "Analisis Fisikokimia", "completed": False},
            {"title": "Uji Organoleptik", "completed": False},
            {"title": "Kerangka Pemikiran", "completed": False},
        ]},
        {"chapter_id": "bab-3", "title": "Bab III - Metodologi Penelitian", "target_pages": 12, "subtasks": [
            {"title": "Waktu dan Tempat", "completed": False},
            {"title": "Bahan dan Alat", "completed": False},
            {"title": "Rancangan Penelitian (RCT)", "completed": False},
            {"title": "Prosedur Penelitian", "completed": False},
            {"title": "Parameter Pengamatan", "completed": False},
            {"title": "Analisis Data", "completed": False},
        ]},
        {"chapter_id": "bab-4", "title": "Bab IV - Hasil dan Pembahasan", "target_pages": 25, "subtasks": [
            {"title": "Analisis Proksimat", "completed": False},
            {"title": "Aktivitas Air (Aw)", "completed": False},
            {"title": "Kapasitas Rehidrasi", "completed": False},
            {"title": "Uji Organoleptik", "completed": False},
            {"title": "Pembahasan Umum", "completed": False},
        ]},
        {"chapter_id": "bab-5", "title": "Bab V - Kesimpulan dan Saran", "target_pages": 3, "subtasks": [
            {"title": "Kesimpulan", "completed": False},
            {"title": "Saran", "completed": False},
        ]},
    ]
    
    for ch in default_chapters:
        chapter = ChapterProgress(**ch)
        await db.progress.insert_one(chapter.model_dump())
    
    return {"status": "seeded", "count": len(default_chapters)}

# ===================== EXPORT STATISTICS TO CSV =====================

@api_router.post("/statistics/export-csv")
async def export_statistics_csv(input: StatisticalInput):
    """Export statistics calculation result as CSV"""
    try:
        groups = input.data
        group_values = list(groups.values())

        # Calculate
        descriptive = {}
        for name, values in groups.items():
            arr = np.array(values, dtype=float)
            descriptive[name] = {
                "mean": round(float(np.mean(arr)), 4),
                "std": round(float(np.std(arr, ddof=1)), 4),
                "min": round(float(np.min(arr)), 4),
                "max": round(float(np.max(arr)), 4),
                "n": len(values)
            }

        f_stat, p_value = stats.f_oneway(*group_values)
        significant = bool(p_value < input.alpha)

        # Build CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([f"Hasil Analisis Statistik - {input.parameter_name}"])
        writer.writerow([f"Tingkat Signifikansi (Alpha): {input.alpha}"])
        writer.writerow([])

        # Raw data
        writer.writerow(["DATA MENTAH"])
        max_len = max(len(v) for v in groups.values())
        header_row = ["Ulangan"] + list(groups.keys())
        writer.writerow(header_row)
        for i in range(max_len):
            row = [i + 1]
            for vals in groups.values():
                row.append(vals[i] if i < len(vals) else "")
            writer.writerow(row)
        writer.writerow([])

        # Descriptive
        writer.writerow(["STATISTIK DESKRIPTIF"])
        writer.writerow(["Perlakuan", "n", "Rata-rata", "Std. Deviasi", "Min", "Max"])
        for name, s in descriptive.items():
            writer.writerow([name, s["n"], s["mean"], s["std"], s["min"], s["max"]])
        writer.writerow([])

        # ANOVA
        writer.writerow(["HASIL ANOVA"])
        writer.writerow(["F-Statistik", "P-Value", "Signifikan"])
        writer.writerow([round(float(f_stat), 4), round(float(p_value), 6), "Ya" if significant else "Tidak"])
        writer.writerow([])

        # DMRT
        if significant:
            dmrt = perform_dmrt(groups, input.alpha)
            writer.writerow(["HASIL UJI DMRT"])
            writer.writerow(["Perlakuan", "Rata-rata", "Notasi DMRT"])
            for item in dmrt["ranked_means"]:
                writer.writerow([item["group"], item["mean"], item["dmrt_group"]])
            writer.writerow([])
            writer.writerow(["MSE", dmrt["mse"]])
            writer.writerow(["SE", dmrt["se"]])
            writer.writerow(["df (within)", dmrt["df_within"]])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=statistik_{input.parameter_name.replace(' ', '_')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===================== IMPORT DATA FROM CSV =====================

@api_router.post("/research-data/import-csv")
async def import_research_data_csv(file: UploadFile = File(...)):
    """Import research data from CSV. Expected format:
    Row 1: Parameter name
    Row 2: Unit
    Row 3: Header (Ulangan, F1, F2, F3)
    Row 4+: Data values
    """
    try:
        content = await file.read()
        text = content.decode("utf-8")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        if len(rows) < 4:
            raise HTTPException(status_code=400, detail="CSV harus memiliki minimal 4 baris (parameter, satuan, header, data)")

        parameter = rows[0][0].strip() if rows[0] else "Parameter"
        unit = rows[1][0].strip() if rows[1] else "%"
        headers = [h.strip() for h in rows[2] if h.strip()]
        
        # Remove "Ulangan" or first column header
        group_names = headers[1:] if len(headers) > 1 else headers

        data = {}
        for name in group_names:
            data[name] = []

        for row in rows[3:]:
            if not any(cell.strip() for cell in row):
                continue
            for i, name in enumerate(group_names):
                col_idx = i + 1
                if col_idx < len(row) and row[col_idx].strip():
                    try:
                        data[name].append(float(row[col_idx].strip()))
                    except ValueError:
                        pass

        # Validate
        if not any(len(v) > 0 for v in data.values()):
            raise HTTPException(status_code=400, detail="Tidak ada data numerik valid ditemukan dalam CSV")

        # Save to DB
        research_data = ResearchData(parameter=parameter, unit=unit, data=data)
        await db.research_data.insert_one(research_data.model_dump())

        return {
            "status": "success",
            "parameter": parameter,
            "unit": unit,
            "groups_imported": {k: len(v) for k, v in data.items()},
            "id": research_data.id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Gagal mengimpor CSV: {str(e)}")

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
