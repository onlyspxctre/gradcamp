import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent,
} from "react"

interface ResizeBounds {
    min: number
    max: number
    unitsPerPixel?: number
}

interface PaneResizeOptions {
    axis: "x" | "y"
    initialValue: number
    getBounds: () => ResizeBounds
    applyValue: (value: number) => void
}

interface Drag {
    pointerId: number
    target: HTMLDivElement
    origin: number
    startValue: number
    bounds: ResizeBounds
}

export function usePaneResize({
    axis,
    initialValue,
    getBounds,
    applyValue,
}: PaneResizeOptions) {
    const [value, setCommittedValue] = useState(initialValue)
    const valueRef = useRef(initialValue)
    const separatorRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<Drag | null>(null)
    const frameRef = useRef<number | null>(null)
    const pendingValueRef = useRef<number | null>(null)

    const apply = useCallback(
        (nextValue: number) => {
            valueRef.current = nextValue
            applyValue(nextValue)
            separatorRef.current?.setAttribute(
                "aria-valuenow",
                String(Math.round(nextValue))
            )
        },
        [applyValue]
    )

    const flush = useCallback(() => {
        frameRef.current = null
        if (pendingValueRef.current === null) return
        const nextValue = pendingValueRef.current
        pendingValueRef.current = null
        apply(nextValue)
    }, [apply])

    const finish = useCallback(
        (commit = true) => {
            const drag = dragRef.current
            if (!drag) return
            dragRef.current = null
            if (frameRef.current !== null)
                cancelAnimationFrame(frameRef.current)
            frameRef.current = null
            if (commit) {
                flush()
                // Persist only on release, not on every pointer event/frame.
                setCommittedValue(valueRef.current)
            }
            pendingValueRef.current = null
            document.body.removeAttribute("data-pane-resize")
            if (drag.target.hasPointerCapture(drag.pointerId)) {
                drag.target.releasePointerCapture(drag.pointerId)
            }
        },
        [flush]
    )

    useEffect(() => {
        const onBlur = () => finish()
        window.addEventListener("blur", onBlur)
        return () => {
            window.removeEventListener("blur", onBlur)
            finish(false)
        }
    }, [finish])

    const readBounds = useCallback(() => {
        const bounds = getBounds()
        separatorRef.current?.setAttribute(
            "aria-valuemin",
            String(Math.round(bounds.min))
        )
        separatorRef.current?.setAttribute(
            "aria-valuemax",
            String(Math.round(bounds.max))
        )
        return bounds
    }, [getBounds])

    useEffect(() => {
        readBounds()
    }, [readBounds])

    const setValue = useCallback(
        (nextValue: number) => {
            const { min, max } = readBounds()
            const clamped = Math.min(max, Math.max(min, nextValue))
            apply(clamped)
            setCommittedValue(clamped)
        },
        [apply, readBounds]
    )

    const onPointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (event.button !== 0 || !event.isPrimary || dragRef.current)
                return
            event.preventDefault()
            // Measure once at drag start; movement only writes CSS, once per frame.
            const bounds = readBounds()
            dragRef.current = {
                pointerId: event.pointerId,
                target: event.currentTarget,
                origin: axis === "x" ? event.clientX : event.clientY,
                startValue: valueRef.current,
                bounds,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            document.body.dataset.paneResize = axis
        },
        [axis, readBounds]
    )

    const queueValue = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            const position = axis === "x" ? event.clientX : event.clientY
            const nextValue =
                drag.startValue +
                (position - drag.origin) * (drag.bounds.unitsPerPixel ?? 1)
            pendingValueRef.current = Math.min(
                drag.bounds.max,
                Math.max(drag.bounds.min, nextValue)
            )
            if (frameRef.current === null)
                frameRef.current = requestAnimationFrame(flush)
        },
        [axis, flush]
    )

    return {
        value,
        setValue,
        separatorProps: {
            ref: separatorRef,
            onPointerDown,
            onFocus: readBounds,
            onPointerMove: queueValue,
            onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
                if (dragRef.current?.pointerId !== event.pointerId) return
                queueValue(event)
                finish()
            },
            onPointerCancel: (event: PointerEvent<HTMLDivElement>) => {
                if (dragRef.current?.pointerId === event.pointerId) finish()
            },
            onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
                if (dragRef.current?.pointerId === event.pointerId) finish()
            },
            "aria-valuenow": Math.round(value),
        },
    }
}
