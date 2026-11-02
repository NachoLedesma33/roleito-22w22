# AGENTS.md

> Especificación de agentes de IA de RPG World Engine.
>
> Define qué agentes existen, qué responsabilidades tiene cada uno,
> qué puede leer, qué puede modificar, qué herramientas tiene
> y a qué datos NO deberían acceder.
>
> Este documento integra el sistema de contexto (CONTEXT-SYSTEM.md),
> el sistema de eventos (EVENT-SYSTEM.md), el canon (DOMAIN.md),
> la ingestión (INGESTION-AND-LORE.md) y la base de datos (DATABASE.md).

---

# 1. Propósito

RPG World Engine utiliza múltiples agentes de IA especializados.

Cada agente tiene un rol acotado:

```text
Role
│
├── Input Context
├── Tools
├── Output
├── Constraints
└── Permissions
```

Ningún agente debería poseer acceso ilimitado a todo el sistema.

El agente NO es el autoridad narrativa final.

El DM lo es.

---

# 2. Agent Principle

```text
The agent is an ASSISTANT, not the AUTHORITY.
```

---

# 3. Agent Registry

Registros iniciales:

```text
SESSION_PROCESSOR
LORE_EXTRACTOR
CANON_VALIDATOR
RECAP_GENERATOR
NARRATOR
SCENE_GENERATOR
CHARACTER_MANAGER
MAP_MANAGER
VOICE_GENERATOR
WORLD_STATE_MANAGER
DM_ASSISTANT
RETRIEVAL_AGENT
VALIDATION_AGENT
SECURITY_AGENT
HUMAN_REVIEW_AGENT
```

---

# 4. Agent Roles

## 4.1 SESSION_PROCESSOR

Procesa una sesión nueva.

```text
INPUT:
- Session source
- Previous state

OUTPUT:
- Candidate events
- Candidate entities
- Candidate relationships
- Candidate secrets
- Candidate locations
- Candidate timeline

TOOLS:
- search_lore
- get_entity
- get_events
- create_candidate

CONSTRAINTS:
- Never write canon directly
- Never approve candidates
- Never modify approved events
```

---

## 4.2 LORE_EXTRACTOR

Extrae información de un documento o fuente.

```text
INPUT:
- Source document
- Document type

OUTPUT:
- Extracted entities
- Extracted events
- Extracted relationships

TOOLS:
- search_lore
- get_entity
- create_candidate

CONSTRAINTS:
- Always tag extraction with source
- Never invent information
- Never write canon
- Preserve original source
```

---

## 4.3 CANON_VALIDATOR

Revisa candidatos y candidate entities/events.

```text
INPUT:
- Candidate list
- Current canon

OUTPUT:
- Validation report
- Conflict list
- Recommended actions

TOOLS:
- search_lore
- get_entity
- get_events
- get_canon
- detect_conflicts

CONSTRAINTS:
- Never approve candidates directly
- Never modify canon
- Always preserve evidence
```

---

## 4.4 RECAP_GENERATOR

Genera recaps a partir de eventos aprobados.

```text
INPUT:
- Approved events
- Session metadata
- Character profiles
- Quest state

OUTPUT:
- Recap document
- Narration script

TOOLS:
- search_lore
- get_entity
- get_events
- get_session
- get_current_state

CONSTRAINTS:
- Only use approved events
- Never invent events
- Never reveal secrets
- Never modify canon
```

---

## 4.5 NARRATOR

Genera narración en tiempo real durante la sesión.

```text
INPUT:
- Current scene
- Previous scene
- Character actions
- Relevant lore
- DM intent
- Open threads

OUTPUT:
- Narration text
- Scene description
- Mood suggestions

TOOLS:
- search_lore
- get_entity
- get_events
- get_current_state
- get_location

CONSTRAINTS:
- Never write canon
- Never approve events
- Never reveal secrets
- Never contradict approved canon
```

---

## 4.6 SCENE_GENERATOR

Prepara contextos visuales, escenarios 3D, ambientación.

```text
INPUT:
- Current location
- Architecture
- Environment
- Characters
- Current state
- Visual references

OUTPUT:
- Scene context
- Visual metadata
- Asset requests

TOOLS:
- search_lore
- get_entity
- get_location
- get_current_state
- get_visual_references

CONSTRAINTS:
- Never modify canon
- Never modify world state
- Never approve events
- Visual only, no narrative authority
```

---

## 4.7 CHARACTER_MANAGER

Gestiona perfiles de personajes y NPCs.

```text
INPUT:
- Character entity
- Related events
- Related relationships

OUTPUT:
- Character profile
- Knowledge state
- Relationship graph

TOOLS:
- search_lore
- get_entity
- get_events
- get_relationships

CONSTRAINTS:
- Never modify canon directly
- Never approve character changes
- Always preserve source
```

---

## 4.8 MAP_MANAGER

Gestiona ubicaciones, mapas, spatial data.

```text
INPUT:
- Location entity
- Related events
- Related characters

OUTPUT:
- Location profile
- Spatial relationships
- Discovery timeline

TOOLS:
- search_lore
- get_entity
- get_location
- get_events

CONSTRAINTS:
- Never modify canon directly
- Never approve location changes
- Always preserve source
```

---

## 4.9 VOICE_GENERATOR

Genera audio, TTS, narración sonora.

```text
INPUT:
- Narration text
- Voice profile
- Mood
- Environment

OUTPUT:
- Audio file
- Voice metadata

TOOLS:
- search_lore
- get_entity
- get_current_state
- get_narration_context

CONSTRAINTS:
- Never modify canon
- Never modify world state
- Never approve events
- Audio only
```

---

## 4.10 WORLD_STATE_MANAGER

Mantiene el estado del mundo.

```text
INPUT:
- Approved events
- Current state

OUTPUT:
- Updated world state
- State diffs
- Snapshot

TOOLS:
- get_current_state
- get_events
- get_entity
- create_snapshot

CONSTRAINTS:
- Never approve events directly
- Only apply approved events
- Always preserve previous state
- Always create snapshot
```

---

## 4.11 DM_ASSISTANT

Asiste al DM durante la sesión.

```text
INPUT:
- Current state
- Relevant lore
- Secrets
- Open threads
- NPC motivations
- Potential consequences

OUTPUT:
- Suggestions
- Summaries
- Conflict alerts
- Context packs

TOOLS:
- search_lore
- get_entity
- get_events
- get_session
- get_current_state
- get_canon
- detect_conflicts

CONSTRAINTS:
- Never approve events directly
- Never modify canon
- May access all data
- Always preserve DM authority
```

---

## 4.12 RETRIEVAL_AGENT

Búsqueda y recuperación de información.

```text
INPUT:
- Query
- Filters
- Scope

OUTPUT:
- Search results
- Ranked entities
- Ranked events

TOOLS:
- search_lore
- get_entity
- get_events
- get_location
- get_relationships

CONSTRAINTS:
- Only retrieve, never modify
- Respect permission filters
- Always preserve source references
```

---

## 4.13 VALIDATION_AGENT

Valida integridad del sistema.

```text
INPUT:
- System state
- Event history
- Entity history

OUTPUT:
- Validation report
- Integrity issues
- Recommendations

TOOLS:
- search_lore
- get_entity
- get_events
- get_canon
- detect_conflicts

CONSTRAINTS:
- Only report, never modify
- Always preserve evidence
```

---

## 4.14 SECURITY_AGENT

Protege secretos y permisos.

```text
INPUT:
- Context request
- Agent permissions
- Secret scope

OUTPUT:
- Filtered context
- Permission decision
- Audit log

TOOLS:
- get_entity
- get_canon
- get_secrets

CONSTRAINTS:
- Never leak secrets
- Always audit
- Never modify data
```

---

## 4.15 HUMAN_REVIEW_AGENT

Intermediario para revisión humana.

```text
INPUT:
- Candidates
- Conflicts
- Important changes

OUTPUT:
- Review queue
- Decision prompts
- Audit log

TOOLS:
- search_lore
- get_entity
- get_events
- get_canon

CONSTRAINTS:
- Never approve directly
- Always preserve human authority
- Always preserve evidence
```

---

# 5. Agent Communication

Los agentes NO deberían comunicarse directamente.

Comunicación a través de:

```text
Event System
+
World State
+
Shared Context
```

---

# 6. Agent Isolation

Un agente NO debería conocer:

```text
Internal prompts de otro agente
Internal context de otro agente
Internal tools de otro agente
```

---

# 7. Agent Delegation

El DM Assistance puede delegar a otros agentes:

```text
DM Assistance
    ↓
SESSION_PROCESSOR
    ↓
LORE_EXTRACTOR
    ↓
CANON_VALIDATOR
    ↓
RECAP_GENERATOR
```

---

# 8. Agent Chaining

Ejemplo de cadena:

```text
1. SESSION_PROCESSOR processes session
2. LORE_EXTRACTOR extracts entities
3. CANON_VALIDATOR validates candidates
4. HUMAN_REVIEW_AGENT presents to DM
5. DM approves
6. WORLD_STATE_MANAGER applies
7. RECAP_GENERATOR generates recap
```

---

# 9. Agent Permissions

```text
PERMISSION LEVELS:

PUBLIC
PLAYER_KNOWN
CHARACTER_KNOWN
DM_ONLY
SECRET
SYSTEM
```

---

# 10. Permission Matrix

| Agent               | PUBLIC | PLAYER | CHARACTER | DM_ONLY | SECRET | SYSTEM |
|---------------------|--------|--------|-----------|---------|--------|--------|
| SESSION_PROCESSOR   | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| LORE_EXTRACTOR      | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| CANON_VALIDATOR     | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| RECAP_GENERATOR     | ✓      | ✓      | ✓         | ✗       | ✗      | ✓      |
| NARRATOR            | ✓      | ✓      | ✓         | ✗       | ✗      | ✓      |
| SCENE_GENERATOR     | ✓      | ✓      | ✓         | ✓       | ✗      | ✓      |
| CHARACTER_MANAGER   | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| MAP_MANAGER         | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| VOICE_GENERATOR     | ✓      | ✓      | ✓         | ✗       | ✗      | ✓      |
| WORLD_STATE_MANAGER | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| DM_ASSISTANT        | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| RETRIEVAL_AGENT     | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| VALIDATION_AGENT    | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| SECURITY_AGENT      | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |
| HUMAN_REVIEW_AGENT  | ✓      | ✓      | ✓         | ✓       | ✓      | ✓      |

---

# 11. Write Permissions

```text
AGENT                          CAN WRITE
─────────────────────────────────────────────────
SESSION_PROCESSOR              candidates
LORE_EXTRACTOR                 candidates
CANON_VALIDATOR                validation reports
RECAP_GENERATOR                recaps
NARRATOR                       narration
SCENE_GENERATOR                scene contexts
CHARACTER_MANAGER              character profiles
MAP_MANAGER                    location profiles
VOICE_GENERATOR                audio files
WORLD_STATE_MANAGER            world state (approved events only)
DM_ASSISTANT                   suggestions, context packs
RETRIEVAL_AGENT                search results
VALIDATION_AGENT               validation reports
SECURITY_AGENT                 audit logs
HUMAN_REVIEW_AGENT             review queues
```

---

# 12. Forbidden Writes

```text
AGENT                          CANNOT WRITE
─────────────────────────────────────────────────
ALL                            approved events directly
ALL                            canon directly
ALL                            secrets directly
ALL                            other agent's data
ALL                            database schema
ALL                            source files
```

---

# 13. Agent Access Patterns

## Reading Pattern

```text
Agent needs info
    ↓
Context Service
    ↓
Permission Filter
    ↓
Data Retrieval
    ↓
Result
```

---

## Writing Pattern

```text
Agent produces output
    ↓
Validation
    ↓
Permission Check
    ↓
Storage
    ↓
Event (if state change)
    ↓
Downstream Context Invalidation
```

---

# 14. Agent Statelessness

Agentes idealmente deberían ser stateless.

El estado reside en:

```text
World State
+
Event History
+
Entity History
```

---

# 15. Agent Recovery

Si un agente falla:

```text
Retry from last checkpoint
+
World State
+
Event History
```

No reconstruir todo el pipeline.

---

# 16. Agent Metrics

Registrar por agente:

```text
invocations
avg_latency
avg_tokens
avg_cost
success_rate
error_rate
```

---

# 17. Agent Versioning

Cada agente puede tener:

```text
agent_id
agent_version
prompt_version
model
```

---

# 18. Agent Configuration

Configuración conceptual:

```yaml
agents:
  session-processor:
    model: local
    max_tokens: 4000
    permissions: [SYSTEM, DM_ONLY]
    
  narrator:
    model: local
    max_tokens: 2000
    permissions: [PUBLIC, PLAYER_KNOWN, CHARACTER_KNOWN]
    
  dm-assistant:
    model: remote
    max_tokens: 8000
    permissions: [ALL]
```

---

# 19. Agent Fallback

Si un agente no está disponible:

```text
FALLBACK MODE

Agent unavailable
    ↓
Simplified Processing
    ↓
Manual Review
```

No bloquear la campaña.

---

# 20. Agent Security

Aunque el sistema sea local:

```text
- Cada agente tiene permisos explícitos
- Nunca asumir confianza implícita
- Siempre auditar acceso a secretos
- Siempre filtrar por scope
```

---

# 21. Agent Audit

Cada invocación debe registrar:

```text
agent_id
agent_version
timestamp
input_hash
output_hash
permissions_used
context_size
tokens_used
duration
status
```

---

# 22. Agent Debugging

Herramientas de debug:

```text
What context did the agent receive?
What tools did it use?
What did it produce?
What was the full prompt?
What was the full output?
```

---

# 23. Agent Monitoring

Métricas en tiempo real:

```text
Active agents
Running tasks
Pending tasks
Failed tasks
Context usage
Token usage
Cost
```

---

# 24. Agent Lifecycle

```text
REGISTERED
    ↓
CONFIGURED
    ↓
ACTIVE
    ↓
PROCESSING
    ↓
COMPLETED / FAILED
    ↓
CLEANUP
```

---

# 25. Agent Scaling

Agentes pueden ejecutarse:

```text
Sequentially
+
Parallel (when independent)
```

Ejemplo paralelo:

```text
SESSION_PROCESSOR
+
LORE_EXTRACTOR
```

pueden correr simultáneamente si son independientes.

---

# 26. Agent Queue

Las tareas de agentes pueden encolarse:

```text
TASK QUEUE

1. Process session 14
2. Extract entities from session 14
3. Validate session 14 candidates
4. Generate recap for session 14
```

---

# 27. Agent Priority

Prioridad de tareas:

```text
CRITICAL
Session Processing
Canon Validation

HIGH
World State Update
Context Generation

MEDIUM
Recap Generation
Narration

LOW
Visual Generation
Audio Generation

OPTIONAL
Analysis
Metrics
```

---

# 28. Agent Hooks

Los agentes pueden tener hooks:

```text
BEFORE_TASK
ON_PROGRESS
ON_COMPLETE
ON_ERROR
AFTER_TASK
```

---

# 29. Agent Events

Los agentes pueden emitir eventos:

```text
agent.task.started
agent.task.completed
agent.task.failed
agent.context.loaded
agent.output.generated
```

---

# 30. Agent Subscriptions

Los agentes pueden suscribirse a eventos:

```text
session.approved → RECAP_GENERATOR
session.processed → CANON_VALIDATOR
canon.approved → WORLD_STATE_MANAGER
entity.updated → CHARACTER_MANAGER
location.updated → MAP_MANAGER
```

---

# 31. Agent Delegation Pattern

```text
DM Assistance
    ↓
Analyze Request
    ↓
Select Agent(s)
    ↓
Provide Context
    ↓
Agent Processes
    ↓
Agent Returns Result
    ↓
DM Reviews
```

---

# 32. Agent Fallback Chain

```text
Primary Agent
    ↓ (failed)
Fallback Agent
    ↓ (failed)
Manual Mode
    ↓ (failed)
Error Report
```

---

# 33. Agent Health Check

Cada agente debe poder reportar:

```text
status: ready | busy | error | unavailable
last_run: timestamp
queue_depth: number
avg_latency: ms
error_count: number
```

---

# 34. Agent Warmup

Al iniciar el sistema:

```text
Load agents
    ↓
Load configurations
    ↓
Load context caches
    ↓
Health check
    ↓
Ready
```

---

# 35. Agent Shutdown

Al cerrar el sistema:

```text
Finish current tasks
    ↓
Flush context caches
    ↓
Save metrics
    ↓
Close connections
```

---

# 36. Agent Persistence

Los agentes NO deben persistir estado propio.

Todo estado persistente reside en:

```text
SQLite
+
World State
+
Event History
+
Context Files
```

---

# 37. Agent Context Contract

Cada agente define:

```text
REQUIRED_INPUT:
- Context fields

OPTIONAL_INPUT:
- Context fields

OUTPUT:
- Data structure

CONSTRAINTS:
- Rules

PERMISSIONS:
- Access levels
```

---

# 38. Agent Context Contract Example

```text
Agent: SCENE_GENERATOR

REQUIRED_INPUT:
- current_location: LocationEntity
- current_scene: SceneState
- characters: CharacterEntity[]
- environment: EnvironmentState

OPTIONAL_INPUT:
- recent_events: EventEntity[]
- historical_location: LocationEntity

OUTPUT:
- SceneContext:
    - visual_metadata: VisualMetadata
    - lighting: LightingState
    - effects: Effect[]
    - mood: Mood

CONSTRAINTS:
- Never modify canon
- Never approve events
- Visual only

PERMISSIONS:
- PUBLIC
- PLAYER_KNOWN
- CHARACTER_KNOWN
```

---

# 39. Agent Security Boundaries

```text
SECURITY RULES:

1. Each agent has explicit permissions
2. Never assume implicit trust
3. Always audit secret access
4. Always filter by scope
5. Never modify another agent's data
6. Never modify canon directly
7. Never approve events directly
8. Always preserve source evidence
```

---

# 40. Agent Data Flow

```text
DATA FLOW:

User Request
    ↓
DM Assistance
    ↓
Agent Selection
    ↓
Context Assembly
    ↓
Permission Filter
    ↓
Agent Processing
    ↓
Output Validation
    ↓
Permission Check
    ↓
Storage
    ↓
Event Emission
    ↓
Downstream Context Invalidation
    ↓
Result
```

---

# 41. Agent and Event System Integration

Los agentes se integran con el Event System:

```text
AGENT → EVENT SYSTEM → WORLD STATE → DOWNSTREAM AGENTS
```

---

# 42. Agent and Context System Integration

Los agentes reciben contexto desde:

```text
Context Builder
    ↓
Permission Filter
    ↓
Agent
```

---

# 43. Agent and Database Integration

Los agentes acceden a datos a través de:

```text
Context Service
    ↓
Database Abstraction
    ↓
SQLite
```

No acceden directamente a la base.

---

# 44. Agent and Source Integration

Los agentes pueden acceder a fuentes originales:

```text
Context Service
    ↓
Source Storage
    ↓
Original Files
```

---

# 45. Agent Error Handling

```text
ERROR HANDLING:

1. Log error with context
2. Determine if recoverable
3. If recoverable: retry with backoff
4. If not recoverable: report to DM
5. Never silently fail
6. Never corrupt state
```

---

# 46. Agent Recovery Patterns

```text
RETRY:
Same input, same agent

FALLBACK:
Same input, different agent

MANUAL:
Report to DM for manual processing

SKIP:
Log and continue with next task
```

---

# 47. Agent Timeout

Cada agente debe tener timeout:

```text
timeout: 30s | 60s | 120s | 300s
```

Si excede:

```text
TIMEOUT
    ↓
Cancel
    ↓
Report
    ↓
Fallback or Manual
```

---

# 48. Agent Cancellation

El DM puede cancelar:

```text
Cancel specific task
Cancel all tasks for agent
Cancel all tasks globally
```

---

# 49. Agent Pause/Resume

El DM puede pausar:

```text
Pause agent
    ↓
Finish current task
    ↓
No new tasks
    ↓
Resume
```

---

# 50. Agent Monitoring Dashboard

La UI del DM puede mostrar:

```text
Active Agents:
- SESSION_PROCESSOR: processing session 14
- LORE_EXTRACTOR: extracting from session 14

Queue:
1. Validate session 14 candidates
2. Generate recap for session 14

Metrics:
- Sessions processed: 14
- Entities extracted: 247
- Events extracted: 1,893
- Conflicts detected: 7
```

---

# 51. Agent and AI Provider

Los agentes utilizan un proveedor de IA:

```text
AI Provider
    ↓
Local Model
    ↓
Remote Model
    ↓
Mock Model
```

---

# 52. Agent Model Selection

Cada agente puede utilizar un modelo diferente:

```text
SESSION_PROCESSOR → local (small)
LORE_EXTRACTOR → local (medium)
CANON_VALIDATOR → local (small)
RECAP_GENERATOR → local (medium)
NARRATOR → local (medium)
SCENE_GENERATOR → remote (large)
CHARACTER_MANAGER → local (medium)
MAP_MANAGER → local (medium)
VOICE_GENERATOR → local (medium)
WORLD_STATE_MANAGER → local (small)
DM_ASSISTANT → remote (large)
RETRIEVAL_AGENT → local (small)
VALIDATION_AGENT → local (small)
SECURITY_AGENT → local (small)
HUMAN_REVIEW_AGENT → local (small)
```

---

# 53. Agent Cost Control

Registrar por agente:

```text
total_tokens
total_cost
avg_tokens_per_invocation
avg_cost_per_invocation
```

---

# 54. Agent Optimization

Prioridades de optimización:

```text
1. Use smaller models when possible
2. Cache frequent contexts
3. Batch independent operations
4. Minimize context size
5. Use local models first
6. Remote only when necessary
```

---

# 55. Agent and LLM Prompting

Cada agente tiene un system prompt:

```text
SYSTEM_PROMPT:
You are the [ROLE] agent.
Your task is [DESCRIPTION].
You have access to [TOOLS].
You can access [DATA].
You cannot access [RESTRICTED_DATA].
You must follow [RULES].
```

---

# 56. Agent Prompt Engineering

Los prompts deben ser:

```text
- Concise
- Specific
- Rule-based
- Context-aware
- Security-conscious
```

---

# 57. Agent and Tool Use

Los agentes utilizan herramientas:

```text
TOOLS:
- search_lore(query)
- get_entity(id)
- get_location(id)
- get_events(filter)
- get_session(id)
- get_relationships(id)
- get_current_state()
- get_source(id)
- get_canon()
- detect_conflicts()
- create_candidate(data)
- create_event(data)
- create_entity(data)
- approve_candidate(id)
- reject_candidate(id)
- create_snapshot()
- get_secrets(filter)
- audit_log(entry)
```

---

# 58. Tool Security

Cada herramienta debe validar:

```text
- Agent permissions
- Input validity
- Output safety
- Audit logging
```

---

# 59. Agent Hallucination Prevention

Los agentes deben:

```text
1. Always cite sources
2. Never invent facts
3. Never assume canon
4. Always mark uncertainty
5. Never present inference as fact
```

---

# 60. Agent Confidence

Cada output debe incluir:

```text
confidence: 0.0 - 1.0
source: source_id
evidence: evidence_list
```

---

# 61. Agent and DM Review

Los outputs importantes deben pasar por revisión:

```text
Agent Output
    ↓
Validation Agent
    ↓
DM Review
    ↓
Approved / Rejected
```

---

# 62. Agent Auto-Approval

Algunas operaciones pueden auto-aprobarse:

```text
LOW RISK:
- Context generation
- Search results
- Summaries

HIGH RISK:
- Canon changes
- Character death
- Secret reveal
- Major event
```

---

# 63. Agent and World State

Los agentes solo modifican el World State a través del Event System:

```text
Agent
    ↓
Event
    ↓
Event System
    ↓
World State
```

No:

```text
Agent
    ↓
Direct Write
```

---

# 64. Agent and Canon

Los agentes NUNCA modifican Canon directamente.

Canon solo cambia mediante:

```text
DM Approval
    ↓
Event System
    ↓
Canon Update
```

---

# 65. Agent and Secrets

Los agentes acceden a secretos solo si:

```text
- Have permission
- Are in DM context
- Secret has been revealed
- Audit logged
```

---

# 66. Agent and Source Evidence

Los agentes preservan evidencia:

```text
Output
    ↓
Source Reference
    ↓
Original Document
```

---

# 67. Agent Collaboration

Agentes pueden colaborar indirectamente:

```text
SESSION_PROCESSOR
    ↓ (produces candidates)
CANON_VALIDATOR
    ↓ (validates candidates)
HUMAN_REVIEW_AGENT
    ↓ (presents to DM)
DM
    ↓ (approves)
WORLD_STATE_MANAGER
    ↓ (applies)
RECAP_GENERATOR
    ↓ (generates recap)
```

---

# 68. Agent Independence

Agentes pueden ser independientes:

```text
SCENE_GENERATOR ← independent
VOICE_GENERATOR ← independent
CHARACTER_MANAGER ← independent
MAP_MANAGER ← independent
```

---

# 69. Agent Dependencies

Agentes pueden tener dependencias:

```text
RECAP_GENERATOR depends on WORLD_STATE_MANAGER
NARRATOR depends on SCENE_GENERATOR
DM_ASSISTANT depends on RETRIEVAL_AGENT
```

---

# 70. Agent Parallelism

Agentes independientes pueden correr en paralelo:

```text
SCENE_GENERATOR
+
VOICE_GENERATOR
+
CHARACTER_MANAGER
+
MAP_MANAGER
```

---

# 71. Agent Sequencing

Agentes dependientes deben correr en secuencia:

```text
SESSION_PROCESSOR → CANON_VALIDATOR → HUMAN_REVIEW_AGENT → WORLD_STATE_MANAGER
```

---

# 72. Agent Error Recovery

Si un agente en la cadena falla:

```text
1. Log error
2. Report to DM
3. Pause downstream agents
4. Wait for resolution
5. Resume or skip
```

---

# 73. Agent and Context Invalidation

Cuando un agente modifica el estado:

```text
Agent Output
    ↓
World State Change
    ↓
Context Invalidation
    ↓
Affected Contexts Rebuilt
```

---

# 74. Agent and Context Freshness

Los agentes deben verificar:

```text
Is context fresh?
Is context stale?
Should context be refreshed?
```

---

# 75. Agent Cache Strategy

```text
CACHE STRATEGY:

1. Cache frequent contexts
2. Invalidate on state change
3. Rebuild only affected contexts
4. Never cache sensitive data without encryption
5. Cache TTL: configurable per context type
```

---

# 76. Agent and Performance

Prioridades de performance:

```text
1. Small context
2. Local retrieval
3. Cached data
4. Incremental updates
5. Parallel processing (when safe)
```

---

# 77. Agent and Scalability

El sistema debe escalar con:

```text
1. More campaigns
2. More sessions
3. More entities
4. More events
5. More agents
```

Sin degradación significativa.

---

# 78. Agent MVP Scope

Para el MVP, implementar solamente:

```text
SESSION_PROCESSOR
LORE_EXTRACTOR
CANON_VALIDATOR
RECAP_GENERATOR
NARRATOR
WORLD_STATE_MANAGER
DM_ASSISTANT
RETRIEVAL_AGENT
```

---

# 79. Agent Post-MVP

Posteriormente agregar:

```text
SCENE_GENERATOR
CHARACTER_MANAGER
MAP_MANAGER
VOICE_GENERATOR
VALIDATION_AGENT
SECURITY_AGENT
HUMAN_REVIEW_AGENT
```

---

# 80. Agent Final Principle

```text
The agent ASSISTS.
The DM DECIDES.
The World State REMEMBERS.
The Context System CONNECTS.
The Event System MEDIATES.
```

No existirán atajos.

Toda información importante debe poder rastrearse hasta:

```text
Source → Event → Canon → World State → Context → Agent Output
```

La campaña debe poder crecer indefinidamente.

La complejidad debe resolverse mediante:

```text
Specialization
+
Isolation
+
Retrieval
+
Hierarchy
+
Permissions
+
Auditing
```

No mediante un agente omnisciente.
