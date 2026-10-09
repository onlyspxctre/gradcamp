import type { SupportedLanguage } from "@/types"

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    id: "c",
    name: "C (GCC 13.2)",
    monacoLang: "c",
    extension: ".c",
    version: "C17",
  },
  {
    id: "cpp",
    name: "C++ (Clang 18)",
    monacoLang: "cpp",
    extension: ".cpp",
    version: "C++20",
  },
  {
    id: "python",
    name: "Python 3",
    monacoLang: "python",
    extension: ".py",
    version: "3.12",
  },
  {
    id: "javascript",
    name: "JavaScript",
    monacoLang: "javascript",
    extension: ".js",
    version: "Node.js 20",
  },
  {
    id: "rust",
    name: "Rust",
    monacoLang: "rust",
    extension: ".rs",
    version: "1.78",
  },
  {
    id: "go",
    name: "Go",
    monacoLang: "go",
    extension: ".go",
    version: "1.22",
  },
]
