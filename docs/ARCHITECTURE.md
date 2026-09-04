# ARCHITECTURE.md

> Arquitectura técnica de RPG World Engine.
>
> Define la estructura técnica del sistema: componentes, módulos,
> interfaces, almacenamiento, flujos de datos, integraciones
> y decisiones de implementación.
>
> Este documento integra todas las especificaciones anteriores
> (CONTEXT.md, DOMAIN.md, DATABASE.md, EVENT-SYSTEM.md,
> INGESTION-AND-LORE.md, CONTEXT-SYSTEM.md, AGENTS-SYSTEM.md).

---

# 1. System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         RPG WORLD ENGINE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │    FRONTEND     │    │    BACKEND      │    │   AI LAYER     │ │
│  │   (React/TS)    │    │   (FastAPI)     │    │  (Providers)   │ │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘ │
│           │                      │                      │          │
│           └──────────────────────┼──────────────────────┘          │
│                                  │                                  │
│                    ┌─────────────┴─────────────┐                   │
│                    │      EVENT SYSTEM          │                   │
│                    │    (In-Process Bus)        │                   │
│                    └─────────────┬─────────────┘                   │
│                                  │                                  │
│           ┌──────────────────────┼──────────────────────┐          │
│           │                      │                      │          │
│  ┌────────┴────────┐    ┌───────┴────────┐    ┌───────┴────────┐ │
│  │   WORLD STATE   │    │     CANON      │    │   CONTEXT      │ │
│  │    (Memory)     │    │   (SQLite)     │    │   BUILDER      │ │
│  └─────────────────┘    └────────────────┘    └────────────────┘ │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │    STORAGE      │    │    SOURCES      │    │   AGENTS       │ │
│  │   (SQLite)      │    │   (Files)       │    │   (IA)         │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 2. Module Structure

```text
roleito/
├── apps/
│   ├── dm/                    # DM control panel
│   ├── player/                # Player view (future)
│   └── renderer/              # 3D scene renderer
│
├── core/
│   ├── domain/                # Domain types and interfaces
│   ├── world/                 # World state logic
│   ├── events/                # Event bus and handlers
│   ├── canon/                 # Canon management
│   ├── memory/                # Context builder
│   ├── narrative/             # Narrative engine
│   └── scenes/                # Scene management
│
├── infrastructure/
│   ├── database/              # SQLite persistence
│   ├── storage/               # File storage
│   ├── ai/                    # AI provider abstraction
│   ├── tts/                   # TTS provider abstraction
│   ├── search/                # Search and retrieval
│   └── cache/                 # Context cache
│
├── backend/
│   ├── api/                   # FastAPI routes
│   ├── services/              # Business logic services
│   └── models/                # SQLAlchemy models
│
├── data/
│   ├── db/                    # SQLite database
│   ├── settings/              # External worldbuilding
│   │   └── archive-in-between/
│   ├── campaigns/             # Campaign-specific data
│   │   └── nuestra-campana/
│   ├── context/               # Generated context files
│   ├── sources/               # Original source files
│   └── snapshots/             # World state snapshots
│
├── assets/
│   ├── characters/            # Character images
│   ├── environments/          # Environment images
│   ├── audio/                 # Audio files
│   ├── video/                 # Video files
│   └── maps/                  # Map images
│
└── docs/
    ├── CONTEXT.md
    ├── PRODUCT.md
    ├── DOMAIN.md
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── EVENT-SYSTEM.md
    ├── CANON.md
    ├── MEMORY.md
    ├── CONTEXT-SYSTEM.md
    ├── INGESTION-AND-LORE.md
    ├── SETTING-INGESTION.md
    ├── AGENTS-SYSTEM.md
    ├── AGENTS.md
    ├── SESSION-SYSTEM.md
    ├── WORLD-STATE.md
    ├── DATA-MODEL.md
    ├── DATA-DIRECTORY.md
    ├── DM-CONTROLLER.md
    ├── RENDERER.md
    ├── SECURITY.md
    ├── PERFORMANCE.md
    ├── TESTING.md
    └── ROADMAP.md
```

---

# 3. Technology Stack

## 3.1 Frontend

```text
React 18+
TypeScript 5+
Vite 5+
TailwindCSS 3+
React Router 6+
React Three Fiber (Phase 3+)
Drei (Phase 3+)
```

---

## 3.2 Backend

```text
Python 3.11+
FastAPI 0.100+
SQLAlchemy 2.0+ (async)
aiosqlite 0.19+
Pydantic 2+
Uvicorn
```

---

## 3.3 Database

```text
SQLite 3.40+
WAL mode
FTS5 (full-text search)
JSON1 (JSON operations)
```

---

## 3.4 AI

```text
Local LLM (Ollama, llama.cpp)
Remote API (OpenAI-compatible)
Provider abstraction layer
```

---

## 3.5 TTS

```text
Local TTS (Piper, Coqui)
Remote TTS (ElevenLabs, etc.)
Provider abstraction layer
```

---

## 3.6 Search

```text
SQLite FTS5 (initial)
Embeddings (Phase 2)
Vector DB optional (Phase 3)
```

---

# 4. Frontend Architecture

## 4.1 DM Panel Structure

```text
apps/dm/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── campaign/
│   │   ├── sessions/
│   │   ├── entities/
│   │   ├── events/
│   │   ├── scenes/
│   │   ├── context/
│   │   ├── agents/
│   │   └── settings/
│   │
│   ├── pages/
│   │   ├── Dashboard
│   │   ├── Campaign
│   │   ├── Sessions
│   │   ├── Entities
│   │   ├── Events
│   │   ├── Scenes
│   │   ├── Context
│   │   ├── Agents
│   │   └── Settings
│   │
│   ├── hooks/
│   ├── services/
│   ├── store/
│   └── types/
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 4.2 State Management

```text
Local State: React hooks
Global State: Zustand or Jotai
Server State: React Query / SWR
```

---

## 4.3 API Communication

```text
Frontend → Backend API → FastAPI → Services → Database
```

REST endpoints initially, WebSocket for real-time later.

---

# 5. Backend Architecture

## 5.1 FastAPI Structure

```text
backend/
├── main.py                   # Application entry
├── api/
│   ├── __init__.py
│   ├── campaign.py
│   ├── session.py
│   ├── entities.py
│   ├── events.py
│   ├── context.py
│   ├── agents.py
│   └── health.py
│
├── services/
│   ├── __init__.py
│   ├── campaign_service.py
│   ├── session_service.py
│   ├── entity_service.py
│   ├── event_service.py
│   ├── context_service.py
│   ├── agent_service.py
│   └── world_state_service.py
│
├── models/
│   ├── __init__.py
│   ├── base.py
│   ├── campaign.py
│   ├── session.py
│   ├── entity.py
│   ├── event.py
│   ├── relationship.py
│   ├── secret.py
│   └── snapshot.py
│
├── database.py
└── config.py
```

---

## 5.2 Service Layer

```text
API Routes
    ↓
Service Layer
    ↓
Domain Logic
    ↓
Infrastructure
    ↓
Database / Files / AI
```

---

## 5.3 Dependency Injection

FastAPI dependency injection:

```text
get_database()
get_event_bus()
get_world_state()
get_context_builder()
get_ai_provider()
```

---

# 6. Core Domain

## 6.1 Domain Types

```typescript
// core/domain/types.ts

interface Campaign {
  id: string;
  name: string;
  settingsId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  id: string;
  campaignId: string;
  sessionNumber: number;
  realDate: Date;
  inGameDate?: string;
  status: 'draft' | 'processing' | 'processed' | 'approved';
  sourceHash?: string;
  processedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

interface Entity {
  id: string;
  campaignId: string;
  type: EntityType;
  name: string;
  canonicalName: string;
  aliases: string[];
  description?: string;
  firstSeenSession?: number;
  lastSeenSession?: number;
  status: 'candidate' | 'active' | 'inactive' | 'dead';
  knowledgeScope: KnowledgeScope;
  sourceId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

type EntityType = 
  | 'character' | 'npc' | 'faction' | 'location' 
  | 'item' | 'creature' | 'quest' | 'concept';

type KnowledgeScope = 
  | 'PUBLIC' | 'PLAYER' | 'DM' | 'SYSTEM';

interface Event {
  id: string;
  campaignId: string;
  sessionId: string;
  type: EventType;
  description: string;
  actorId?: string;
  targetId?: string;
  locationId?: string;
  timestamp?: string;
  payload: Record<string, any>;
  sourceId: string;
  sourceChunk?: string;
  confidence: number;
  canonStatus: CanonStatus;
  knowledgeScope: KnowledgeScope;
  status: EventStatus;
  approvedBy?: string;
  approvedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

type EventType = 
  | 'character_action' | 'npc_action' | 'combat' 
  | 'discovery' | 'travel' | 'social' | 'magic' 
  | 'environment' | 'meta' | 'quest' | 'location_change';

type CanonStatus = 
  | 'PROPOSED' | 'UNCONFIRMED' | 'CANON' 
  | 'CONTRADICTORY' | 'REJECTED' | 'DM_ONLY';

type EventStatus = 
  | 'DETECTED' | 'PROPOSED' | 'REVIEW' 
  | 'APPROVED' | 'CANON' | 'REJECTED' | 'RETCONNED';

interface Relationship {
  id: string;
  campaignId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  description?: string;
  confidence: number;
  status: 'candidate' | 'active' | 'inactive';
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Secret {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  scope: KnowledgeScope;
  knowledgeHolders: string[];
  discoveryEventId?: string;
  status: 'hidden' | 'partially_revealed' | 'revealed';
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Snapshot {
  id: string;
  campaignId: string;
  sessionId: string;
  worldStateVersion: number;
  data: WorldState;
  createdAt: Date;
}
```

---

# 7. Event System Architecture

## 7.1 Event Bus

```text
In-Process Event Bus
(Node.js EventEmitter equivalent in Python)

EventBus
    │
    ├── on(event_type, handler)
    ├── emit(event_type, data)
    └── off(event_type, handler)
```

---

## 7.2 Event Flow

```text
Agent / UI / API
    ↓
create_event()
    ↓
Event System
    ↓
Event Handlers
    ├── World State Handler
    ├── Canon Handler
    ├── Context Invalidation Handler
    ├── Agent Notification Handler
    └── Audit Log Handler
    ↓
Event Stored in SQLite
```

---

## 7.3 Event Handlers

```python
# Conceptual

class WorldStateHandler:
    def handle(self, event: Event):
        if event.status == 'approved':
            self.world_state.apply_event(event)
            self.context_builder.invalidate(event)

class CanonHandler:
    def handle(self, event: Event):
        if event.type == 'canon_change':
            self.canon.update(event)

class ContextInvalidationHandler:
    def handle(self, event: Event):
        affected = self.context_builder.find_affected(event)
        for ctx in affected:
            ctx.mark_stale()

class AgentNotificationHandler:
    def handle(self, event: Event):
        self.agent_service.notify(event)

class AuditLogHandler:
    def handle(self, event: Event):
        self.audit.log(event)
```

---

# 8. World State Architecture

## 8.1 World State Structure

```python
class WorldState:
    version: int
    campaign_id: str
    session_id: str
    
    characters: dict[str, CharacterState]
    npcs: dict[str, NPCState]
    locations: dict[str, LocationState]
    factions: dict[str, FactionState]
    quests: dict[str, QuestState]
    items: dict[str, ItemState]
    
    current_location: str
    current_date: str
    active_threads: list[str]
    
    applied_events: list[str]
    created_at: datetime
```

---

## 8.2 World State Updates

```text
Event Approved
    ↓
World State.apply_event()
    ↓
State Mutation
    ↓
Version Increment
    ↓
Snapshot
    ↓
Context Invalidation
```

---

## 8.3 World State Snapshots

```text
snapshots/
├── session-001/
├── session-002/
└── ...
```

Each session = one snapshot.

Allows rollback and historical queries.

---

# 9. Context System Architecture

## 9.1 Context Builder

```python
class ContextBuilder:
    def build_context(
        self,
        task: str,
        agent: Agent,
        session_id: Optional[str] = None
    ) -> Context:
        
        # Level 0: System
        system = self.get_system_context(agent)
        
        # Level 1: Campaign
        campaign = self.get_campaign_context()
        
        # Level 2: Current State
        state = self.get_current_state()
        
        # Level 3: Current Session
        session = self.get_current_session(session_id)
        
        # Level 4: Task
        task_ctx = self.build_task_context(task)
        
        # Level 5: Relevant Entities
        entities = self.retrieve_entities(task_ctx)
        
        # Level 6: Relevant Events
        events = self.retrieve_events(task_ctx)
        
        # Level 7: Historical
        historical = self.retrieve_historical(task_ctx)
        
        # Level 8: Evidence
        evidence = self.retrieve_evidence(task_ctx)
        
        # Apply budget
        context = self.apply_budget(
            system, campaign, state, session,
            task_ctx, entities, events, historical, evidence
        )
        
        return context
```

---

## 9.2 Context Files

```text
context/
├── campaign.md              # Level 1
├── current-state.md         # Level 2
├── current-session.md       # Level 3
├── party.md                 # Level 5
├── active-threads.md        # Level 6
│
├── entities/
│   ├── characters/
│   ├── npcs/
│   ├── locations/
│   ├── factions/
│   ├── quests/
│   └── items/
│
├── sessions/
│   ├── session-001.md
│   ├── session-002.md
│   └── ...
│
└── sources/
    └── ... (reference only)
```

---

## 9.3 Context Generation

```text
Database Change
    ↓
Context Generator
    ↓
Markdown Files
    ↓
Cache Invalidation
```

---

# 10. Ingestion Architecture

## 10.1 Ingestion Pipeline

```text
Source Files
    ↓
Import Queue
    ↓
Classification
    ↓
Normalization
    ↓
Segmentation
    ↓
Entity Extraction (LORE_EXTRACTOR)
    ↓
Event Extraction (LORE_EXTRACTOR)
    ↓
Relationship Extraction (LORE_EXTRACTOR)
    ↓
Candidate Creation
    ↓
Validation (CANON_VALIDATOR)
    ↓
DM Review (HUMAN_REVIEW_AGENT)
    ↓
Approval
    ↓
World State Update (WORLD_STATE_MANAGER)
    ↓
Context Regeneration
    ↓
Recap Generation (RECAP_GENERATOR)
```

---

## 10.2 Source Storage

```text
sources/
├── sessions/
│   ├── session-001.txt
│   ├── session-001-normalized.md
│   └── ...
├── notes/
├── maps/
├── images/
├── audio/
└── documents/
```

---

# 11. Database Architecture

## 11.1 SQLite Configuration

```python
DATABASE_URL = "sqlite+aiosqlite:///./data/db/roleito.db"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={
        "check_same_thread": False
    }
)

# Enable WAL mode
# Enable FTS5
# Enable JSON1
```

---

## 11.2 Tables (Summary)

```text
campaigns
sessions
entities
entity_aliases
events
event_chunks
relationships
secrets
secret_holders
canon
snapshots
sources
source_chunks
context_cache
audit_log
agent_runs
```

---

## 11.3 Indexes

```text
Primary keys on all tables
Foreign key indexes
FTS5 indexes on searchable text
JSON indexes on metadata
Composite indexes for common queries
```

---

# 12. AI Integration

## 12.1 Provider Abstraction

```python
class AIProvider:
    async def complete(
        self,
        prompt: str,
        system: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        raise NotImplementedError

class LocalProvider(AIProvider):
    """Ollama, llama.cpp"""
    pass

class RemoteProvider(AIProvider):
    """OpenAI-compatible API"""
    pass

class MockProvider(AIProvider):
    """Testing"""
    pass
```

---

## 12.2 Provider Selection

```python
class AIConfig:
    providers = {
        'local': LocalProvider(base_url='http://localhost:11434'),
        'remote': RemoteProvider(api_key='...'),
        'mock': MockProvider()
    }
    
    agent_models = {
        'SESSION_PROCESSOR': 'local',
        'LORE_EXTRACTOR': 'local',
        'CANON_VALIDATOR': 'local',
        'RECAP_GENERATOR': 'local',
        'NARRATOR': 'local',
        'SCENE_GENERATOR': 'remote',
        'DM_ASSISTANT': 'remote',
        'RETRIEVAL_AGENT': 'local',
        'VALIDATION_AGENT': 'local',
        'SECURITY_AGENT': 'local',
    }
```

---

## 12.3 Token Budget

```python
class TokenBudget:
    fast = 4000
    balanced = 10000
    deep = 20000
```

---

# 13. TTS Integration

## 13.1 Provider Abstraction

```python
class TTSProvider:
    async def synthesize(
        self,
        text: str,
        voice: str,
        mood: str,
        speed: float
    ) -> bytes:
        raise NotImplementedError

class LocalTTSProvider(TTSProvider):
    """Piper, Coqui"""
    pass

class RemoteTTSProvider(TTSProvider):
    """ElevenLabs, etc."""
    pass
```

---

# 14. Search Architecture

## 14.1 Search Layers

```text
Layer 1: SQLite FTS5
Layer 2: Metadata Search
Layer 3: Entity Search
Layer 4: Embeddings (Phase 2)
Layer 5: Graph Retrieval (Phase 3)
```

---

## 14.2 Search Interface

```python
class SearchService:
    async def search_lore(
        self,
        query: str,
        filters: SearchFilters,
        limit: int
    ) -> list[SearchResult]:
        pass
    
    async def get_entity(self, id: str) -> Entity:
        pass
    
    async def get_events(
        self,
        filters: EventFilters,
        limit: int
    ) -> list[Event]:
        pass
    
    async def get_location(self, id: str) -> Location:
        pass
    
    async def get_relationships(
        self,
        entity_id: str
    ) -> list[Relationship]:
        pass
```

---

# 15. File Storage

## 15.1 Structure

```text
data/
├── db/
│   └── roleito.db
├── settings/
│   └── archive-in-between/
├── campaigns/
│   └── nuestra-campana/
├── context/
│   ├── campaign.md
│   ├── current-state.md
│   └── ...
├── sources/
│   ├── sessions/
│   ├── notes/
│   └── ...
├── snapshots/
│   ├── session-001/
│   └── ...
└── cache/
    ├── context/
    └── search/
```

---

## 15.2 File Operations

```python
class FileStorage:
    async def read(self, path: str) -> bytes:
        pass
    
    async def write(self, path: str, data: bytes) -> None:
        pass
    
    async def list(self, pattern: str) -> list[str]:
        pass
    
    async def delete(self, path: str) -> None:
        pass
    
    async def hash(self, path: str) -> str:
        pass
```

---

# 16. Security Architecture

## 16.1 Permission Levels

MVP usa 4 niveles (ver SECURITY.md):

```text
PUBLIC
PLAYER
DM
SYSTEM
```

---

## 16.2 Access Control

```python
class PermissionFilter:
    def filter_context(
        self,
        context: Context,
        agent_permissions: list[PermissionLevel]
    ) -> Context:
        
        filtered = []
        for item in context.items:
            if item.scope in agent_permissions:
                filtered.append(item)
        
        return Context(items=filtered)
```

---

## 16.3 Secret Isolation

```python
class SecretManager:
    async def get_secrets(
        self,
        campaign_id: str,
        scope: PermissionLevel
    ) -> list[Secret]:
        
        if scope == 'DM' or scope == 'SYSTEM':
            return await self.db.get_all_secrets(campaign_id)
        elif scope == 'PLAYER':
            return await self.db.get_revealed_secrets(campaign_id)
        else:
            return []
```

---

# 17. Caching Architecture

## 17.1 Cache Layers

```text
L1: In-Memory Cache (hot context)
L2: File Cache (generated markdown)
L3: Database Cache (context snapshots)
```

---

## 17.2 Cache Invalidation

```python
class CacheInvalidator:
    def on_world_state_change(self, event: Event):
        affected = self.find_affected_contexts(event)
        for ctx in affected:
            self.invalidate(ctx)
    
    def find_affected_contexts(self, event: Event) -> list[str]:
        # Determine which contexts depend on changed data
        pass
```

---

# 18. API Architecture

## 18.1 REST Endpoints

```text
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id

GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id/approve

GET    /api/entities
GET    /api/entities/:id
POST   /api/entities

GET    /api/events
GET    /api/events/:id
POST   /api/events
PUT    /api/events/:id/approve
PUT    /api/events/:id/reject

GET    /api/context/current-state
GET    /api/context/session/:id
GET    /api/context/entity/:id
GET    /api/context/search

GET    /api/agents
GET    /api/agents/:id
POST   /api/agents/:id/run

GET    /api/health
```

---

## 18.2 WebSocket (Phase 2)

```text
WS /api/ws/campaign/:id

Events:
- world_state.updated
- event.created
- event.approved
- entity.updated
- agent.task.started
- agent.task.completed
```

---

# 19. Development Workflow

## 19.1 Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd apps/dm
npm install
npm run dev
```

---

## 19.2 Database Migrations

```bash
alembic upgrade head
alembic revision --autogenerate -m "description"
```

---

## 19.3 Testing

```bash
# Backend
pytest

# Frontend
npm run test

# E2E
npm run test:e2e
```

---

# 20. Deployment

## 20.1 Local-First

```text
Single machine deployment
SQLite + file storage
Local LLM (optional)
```

---

## 20.2 Future Options

```text
Docker compose
Remote database
Remote LLM
Remote TTS
```

---

# 21. Performance Considerations

## 21.1 SQLite Optimization

```text
WAL mode
Appropriate indexes
Connection pooling
Query optimization
```

---

## 21.2 Context Optimization

```text
Small context files
Cached contexts
Incremental updates
Lazy loading
```

---

## 21.3 AI Optimization

```text
Local models first
Smaller models when possible
Batch processing
Context compression
```

---

# 22. Scalability

## 22.1 Campaign Scale

```text
5 sessions → 500+ sessions
10 entities → 1000+ entities
100 events → 10000+ events
```

---

## 22.2 Approach

```text
Hierarchical summaries
Indexed queries
Lazy loading
Context caching
Incremental processing
```

---

# 23. Monitoring

## 23.1 Metrics

```text
API response times
Database query times
Context generation times
AI invocation times
Agent task completion rates
Token usage
Error rates
```

---

## 23.2 Logging

```text
Structured logging
Audit trails
Agent runs
Event processing
Context generation
```

---

# 24. Error Handling

## 24.1 Error Types

```text
ValidationError
NotFoundError
ConflictError
PermissionError
AIServiceError
DatabaseError
```

---

## 24.2 Error Recovery

```text
Retry with backoff
Fallback agents
Manual intervention
State rollback
```

---

# 25. Configuration

## 25.1 Config Files

```text
config.yaml
├── database
├── ai
├── tts
├── cache
├── context
├── agents
├── security
└── server
```

---

## 25.2 Environment Variables

```text
DATABASE_URL
AI_PROVIDER
AI_API_KEY
TTS_PROVIDER
TTS_API_KEY
SECRET_KEY
```

---

# 26. Future Phases

## 26.1 Phase 1 (MVP)

```text
✅ Core domain types
✅ Event system
✅ World state
✅ Basic context builder
✅ SQLite persistence
✅ Basic AI integration
✅ DM panel UI
✅ Session processing
✅ Entity extraction
✅ Event extraction
✅ Canon management
✅ Basic search
```

---

## 26.2 Phase 2

```text
Context optimization
Embeddings
Vector search
WebSocket
Advanced search
Agent improvements
```

---

## 26.3 Phase 3

```text
3D renderer
TTS integration
Video generation
Graph retrieval
Advanced analytics
```

---

## 26.4 Phase 4

```text
Multiplayer
Cloud sync
Plugin system
Advanced AI features
```

---

# 27. Three-State Architecture

## 27.1 Overview

Roleito follows the three-state model from Owlbear Rodeo:

```text
PERSISTENT STATE          TRANSIENT STATE          EPHEMERAL STATE
(Scene Graph,            (Interaction API,         (Broadcast API,
 World State,             selection, scroll,        emotes, cursors,
 Campaign Data)           pointer, measurements)    custom events)
     │                          │                          │
     ▼                          ▼                          ▼
  SQLite DB              Real-time sync             WebSocket
  File storage           Interpolated              Fire-and-forget
  Survives restart       Never persisted            Gone after event
```

**Persistent State**: The scene graph (Items), world state, campaign data, fog of war. Stored in SQLite and files. Survives session restarts. Source of truth.

**Transient State**: Player interaction state — selection, scroll position, pointer, measurements, rulers. Real-time, interpolated between peers. Never persisted to disk. Reconstructed from last known state on reconnect.

**Ephemeral State**: One-shot broadcast events — emotes, name tags, cursor images, custom events. Emitted once, consumed, gone. No persistence, no replay.

### See Also
- `SCENE-GRAPH.md` — Item system, layers, attachments
- `FOG-AND-VISIBILITY.md` — Fog persistence and per-player visibility
- `OWLBEAR-REFERENCE.md` — Owlbear's three-state implementation details

---

# 28. Architecture Principles

```text
1. LOCAL-FIRST
   No external dependencies required

2. EVENT-DRIVEN
   All state changes through events

3. WORLD STATE AS SOURCE OF TRUTH
   Derived data can be rebuilt

4. CANON IS SACRED
   Only DM can change canon

5. CONTEXT IS DERIVED
   Can be rebuilt from sources

6. AGENTS ARE ASSISTANTS
   Never authorities

7. PROGRESSIVE ENRICHMENT
   Start simple, add complexity

8. AUDITABLE
   All changes tracked

9. SECURE
   Logical separation even locally

10. RECOVERABLE
    Any state can be rebuilt

11. THREE-STATE MODEL
    Persistent (source of truth), Transient (real-time), Ephemeral (fire-and-forget)

12. SELECTION BELONGS TO PLAYER
    Not to Items — player-centric selection model

13. LAYER ≠ Z-INDEX
    Layer = category, zIndex = order within layer. Never interchangeable.
```

---

# 29. New Systems (Post-Owlbear Analysis)

The following systems were designed based on analysis of Owlbear Rodeo architecture:

| System | Document | Key Concept |
|--------|----------|-------------|
| Scene Graph | `SCENE-GRAPH.md` | Items, layers, zIndex, attachments, shapes |
| Map Analysis | `MAP-ANALYSIS.md` | Image → rooms/walls/doors → semantic scene |
| Fog of War | `FOG-AND-VISIBILITY.md` | Static (exploration) + Dynamic (per-turn LoS) |
| Walls & LoS | `WALLS-AND-LINE-OF-SIGHT.md` | Raycasting, visibility masks, pathfinding |
| Lighting | `LIGHTING-SYSTEM.md` | Point/cone/line/ambient, wall occlusion |
| Assets | `ASSET-SYSTEM.md` | CC0-only, manifests, AI generation |
| 2D→3D | `2D-TO-3D.md` | Scene graph → Three.js mapping |
| Reference | `OWLBEAR-REFERENCE.md` | Technical patterns to adopt/adapt |
| Status | `IMPLEMENTATION-STATUS.md` | What's built vs planned |

### Key Differentiator
Owlbear does NOT semantically interpret map images. Roleito builds:
```text
Map Analyzer → Semantic Scene → 2D Battlemap + 3D Immersive View
```
from the same source image. This is Roleito's core advantage.

---

# 30. Integration Map

```text
CONTEXT.md ← All agents read first
    ↓
DOMAIN.md ← Types and interfaces
    ↓
DATABASE.md ← Persistence
    ↓
EVENT-SYSTEM.md ← Core pipeline
    ↓
CANON.md ← Canon management
    ↓
CONTEXT-SYSTEM.md ← Context building
    ↓
INGESTION-AND-LORE.md ← Historical import
    ↓
AGENTS-SYSTEM.md ← Agent definitions
    ↓
ARCHITECTURE.md ← Technical implementation
    ↓
NEW SYSTEMS (Post-Owlbear):
    SCENE-GRAPH.md ← Item system
    MAP-ANALYSIS.md ← Image → scene
    FOG-AND-VISIBILITY.md ← Fog + LoS
    WALLS-AND-LINE-OF-SIGHT.md ← Walls + raycasting
    LIGHTING-SYSTEM.md ← Dynamic lighting
    ASSET-SYSTEM.md ← Asset management
    2D-TO-3D.md ← 3D rendering
```

---

# 29. Final Architecture

```text
                        USER
                          │
                          ▼
                    ┌──────────┐
                    │ DM PANEL │
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │ BACKEND  │
                    └────┬─────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌─────────┐  ┌──────────┐  ┌─────────┐
      │  EVENT  │  │  WORLD   │  │ CONTEXT │
      │ SYSTEM  │  │  STATE   │  │ BUILDER │
      └────┬────┘  └────┬─────┘  └────┬────┘
           │             │             │
           └─────────────┼─────────────┘
                         │
                         ▼
                    ┌──────────┐
                    │  SQLite  │
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │  AGENTS  │
                    └──────────┘
```

---

# 30. Final Principle

The architecture must support:

```text
Campaign
    ↓
Lore
    ↓
Context
    ↓
Agent
    ↓
Output
```

without requiring:

```text
- External cloud services
- Massive context windows
- Single monolithic prompts
- Unauditable AI decisions
- Loss of source evidence
```

The system must grow from 5 sessions to 500+ sessions
while keeping individual task context small and relevant.

Complexity is resolved through:

```text
Retrieval
+
Hierarchy
+
Summaries
+
Caching
+
Metadata
+
Permissions
+
Temporal State
+
Source References
```

Never through giant prompts.
