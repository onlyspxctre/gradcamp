import { record } from "./progressValidation.ts"

export type ProgressStatus = "solved" | "attempted" | "todo"
export type ProgressById = ReadonlyMap<string, unknown>

export interface ProgressCodec {
    id: string
    restore: (saved: unknown) => unknown
    legacyKey?: "lecture" | "quiz"
}

export interface ProgressDefinition<State, Action> extends ProgressCodec {
    initial: () => State
    restore: (saved: unknown) => State
    reduce: (state: State, action: Action) => State
    status: (state: State) => ProgressStatus
}

export function readProgress<State, Action>(
    progress: ProgressById,
    definition: ProgressDefinition<State, Action>
): State {
    // The registered definition is the only codec and reducer for this ID.
    return progress.has(definition.id)
        ? (progress.get(definition.id) as State)
        : definition.initial()
}

export function updateProgress<State, Action>(
    progress: ProgressById,
    definition: ProgressDefinition<State, Action>,
    action: Action
): ProgressById {
    const previous = readProgress(progress, definition)
    const next = definition.reduce(previous, action)
    return next === previous
        ? progress
        : new Map(progress).set(definition.id, next)
}

function decode(raw: string | null, version: number) {
    if (!raw) return undefined
    try {
        const value: unknown = JSON.parse(raw)
        if (record(value) && value.version === version) return value
    } catch {
        // Corrupt browser saves are treated as missing.
    }
}

export function restoreAssignmentProgress(
    current: string | null,
    legacy: string | null,
    codecs: readonly ProgressCodec[]
): ProgressById {
    const saved = decode(current, 2)?.byAssignment
    const old = record(saved) ? undefined : decode(legacy, 1)
    const progress = new Map<string, unknown>()
    for (const codec of codecs) {
        const source = record(saved) ? saved : old
        const key = record(saved) ? codec.id : codec.legacyKey
        if (source && key && Object.hasOwn(source, key))
            progress.set(codec.id, codec.restore(source[key]))
    }
    return progress
}

export function serializeAssignmentProgress(progress: ProgressById): string {
    return JSON.stringify({
        version: 2,
        byAssignment: Object.fromEntries(progress),
    })
}
