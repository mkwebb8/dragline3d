---
name: bdi-mental-states
description: Use this skill when modeling agent cognition through BDI (Belief-Desire-Intention) frameworks, processing RDF context into formal beliefs, enabling explainable reasoning traces in multi-agent systems, or implementing Logic Augmented Generation (LAG). Requires shared ontology across agents. Route general memory persistence to memory-systems; route multi-agent topology to multi-agent-patterns; route evaluation rubrics to evaluation.
---

# BDI Mental State Modeling

BDI (Belief-Desire-Intention) modeling enables agents to transform external RDF context into formal mental states, supporting explainable reasoning in multi-agent systems. Keep the ontology minimal: start with the core entities and expand only when competency questions prove necessity.

## When to Activate

Activate this skill when:
- Modeling agent cognition through BDI frameworks
- Processing RDF into formal belief structures
- Enabling rational agency traces for explainability
- Implementing Logic Augmented Generation (LAG)
- Designing systems where agents must explain their reasoning in auditable form

Do not activate for:
- General memory persistence across sessions → memory-systems
- Multi-agent topology decisions → multi-agent-patterns
- Evaluation rubric design → evaluation

## Core Architecture

The framework separates two categories:

**Mental states (endurants)**: Persist through time.
- `Belief`: What the agent takes to be true about the world
- `Desire`: What the agent wants to achieve
- `Intention`: What the agent is committed to doing

**Mental processes (perdurants)**: Occur at a point in time.
- `BeliefProcess`: The act of forming a belief
- `DesireProcess`: The act of forming a desire
- `IntentionProcess`: The act of committing to an intention

Mental entities connect via bidirectional properties:
- `motivates` / `isMotivatedBy` (Desire → Intention)
- `fulfils` / `isFulfilledBy` (Intention → Desire)

This dual directionality supports both forward reasoning and backward tracing of agent decisions.

## T2B2T Pipeline

Implement Triples-to-Beliefs-to-Triples as a two-phase transformation:

**Phase 1 (Triples → Beliefs):**
- External RDF input triggers belief formation
- Assign provenance and validity intervals at formation time
- Ground beliefs to world-state references via `bdi:refersTo`

**Phase 2 (Beliefs → Triples):**
- BDI deliberation executes
- Results project back into RDF for downstream consumption
- Preserves semantic queryability and cross-agent interoperability

## Six-Pass Conversion Workflow

1. Define world-state substrate (what facts exist in the world model)
2. Create belief instances with provenance (`bdi:assertedBy`, `bdi:assertedAt`)
3. Derive desires from beliefs (`bdi:motivatedBy`)
4. Commit deliberate intentions (`bdi:intends`, `bdi:hasPlan`)
5. Project execution results back to world-state
6. Validate via competency questions: "Can I trace why this intention was formed?"

## Temporal Validity

Assign `bdi:hasValidity` intervals with start/end times to every belief. Prevents:
- Stale belief persistence (acting on outdated facts)
- Diachronic conflict detection (two beliefs about the same fact at different times)

## Minimal Ontology

Start with these entities only:
- Agent, WorldState, Belief, Desire, Intention
- Plan, Task, Justification, TimeInterval

Expand only when a competency question cannot be answered with the minimal set.

## World State Grounding

Always anchor mental states to world-state references via `bdi:refersTo` rather than free text. Preserves semantic queryability and enables cross-agent interoperability when agents share the same world-state substrate.

## Integration

- memory-systems: long-term persistence of beliefs across sessions
- multi-agent-patterns: shared world-state substrate across agents
- evaluation: competency questions as the evaluation framework for BDI systems
- harness-engineering: locked world-state as an append-only surface agents cannot corrupt
