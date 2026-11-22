export const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(max, Number.isFinite(value) ? Math.trunc(value) : 0))

export function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}
export function index(value: unknown, max: number): number {
    return typeof value === "number" ? clamp(value, max) : 0
}
