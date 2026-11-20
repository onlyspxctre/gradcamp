import type { ComponentPropsWithoutRef } from "react"

type AppLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "onClick"> & {
    href: string
    navigate: (path: string) => void
}

export function AppLink({ href, navigate, ...props }: AppLinkProps) {
    return (
        <a
            {...props}
            href={href}
            onClick={(event) => {
                // Let the browser handle modified clicks and links to other tabs.
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    (props.target && props.target !== "_self") ||
                    props.download !== undefined
                ) {
                    return
                }
                event.preventDefault()
                navigate(href)
            }}
        />
    )
}
