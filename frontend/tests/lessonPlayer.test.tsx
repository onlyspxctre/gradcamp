import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { LessonPlayer } from "../src/components/learning/LessonPlayer"

const sections = [
    {
        id: "first",
        title: "First section",
        frames: [{ explanation: "First explanation" }],
    },
    {
        id: "second",
        title: "Second section",
        frames: [
            { explanation: "Second explanation" },
            { explanation: "Final explanation" },
        ],
    },
]

function renderPlayer(completed: boolean) {
    return renderToStaticMarkup(
        <LessonPlayer
            sections={sections}
            progress={{
                chapter: 1,
                step: 1,
                viewed: ["first", "second"],
                completed,
            }}
            onNavigate={() => {}}
            onComplete={() => {}}
        />
    )
}

test("renders caller-provided sections without a visualization or quiz", () => {
    const html = renderPlayer(false)
    assert.match(html, /Section 2 of 2/)
    assert.match(html, /aria-label="Go to step 2" aria-pressed="true"/)
    assert.match(html, /Final explanation/)
    assert.match(html, /Mark lecture complete/)

    const completed = renderPlayer(true)
    assert.match(completed, /Lecture completed/)
    assert.doesNotMatch(completed, /Open memory lab|Continue to the quiz/)
})
