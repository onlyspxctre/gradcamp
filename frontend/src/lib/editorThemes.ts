import type { BeforeMount } from "@monaco-editor/react"

// Match the workbench surfaces instead of embedding a default VS Code theme.
export const configureEditorThemes: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("gradcamp-light", {
        base: "vs",
        inherit: true,
        rules: [
            { token: "comment", foreground: "7C8B96", fontStyle: "italic" },
            { token: "keyword", foreground: "456584" },
            { token: "number", foreground: "8A6948" },
            { token: "string", foreground: "447568" },
            { token: "type", foreground: "576D8B" },
        ],
        colors: {
            "editor.background": "#FBFCFD",
            "editor.foreground": "#2F4254",
            "editorLineNumber.foreground": "#9CAAB6",
            "editorLineNumber.activeForeground": "#456584",
            "editor.lineHighlightBackground": "#EEF2F6",
            "editor.selectionBackground": "#DCE7F2",
            "editor.inactiveSelectionBackground": "#E7EDF2",
            "editorCursor.foreground": "#456584",
            "editorIndentGuide.background1": "#E3E9EE",
            "editorWidget.background": "#FDFDFB",
            "editorWidget.border": "#DBE1E5",
            "editorSuggestWidget.background": "#FDFDFB",
            "editorSuggestWidget.border": "#DBE1E5",
            "editorSuggestWidget.selectedBackground": "#E4ECF3",
        },
    })
    monaco.editor.defineTheme("gradcamp-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "8C9CA9", fontStyle: "italic" },
            { token: "keyword", foreground: "AAC5DF" },
            { token: "number", foreground: "D6B786" },
            { token: "string", foreground: "94BEAD" },
            { token: "type", foreground: "B8BDD9" },
        ],
        colors: {
            "editor.background": "#1B2530",
            "editor.foreground": "#DEE5EB",
            "editorLineNumber.foreground": "#718392",
            "editorLineNumber.activeForeground": "#AAC5DF",
            "editor.lineHighlightBackground": "#243342",
            "editor.selectionBackground": "#38516B",
            "editor.inactiveSelectionBackground": "#2A3948",
            "editorCursor.foreground": "#AAC5DF",
            "editorIndentGuide.background1": "#34414E",
            "editorWidget.background": "#232F3B",
            "editorWidget.border": "#435363",
            "editorSuggestWidget.background": "#232F3B",
            "editorSuggestWidget.border": "#435363",
            "editorSuggestWidget.selectedBackground": "#2D4052",
        },
    })
}
