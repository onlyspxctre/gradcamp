import { Button } from "@/components/ui/button"
import {
    MAX_ARGUMENTS,
    PYTHON_TYPES,
    type PythonSignature,
    type PythonType,
} from "./pythonSignature"

function TypeSelect({
    label,
    value,
    onChange,
}: {
    label: string
    value: PythonType
    onChange: (type: PythonType) => void
}) {
    return (
        <label className="block min-w-0 text-sm font-medium">
            {label}
            <select
                value={value}
                onChange={(event) => onChange(event.target.value as PythonType)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
                {Object.entries(PYTHON_TYPES).map(([type, name]) => (
                    <option key={type} value={type}>
                        {name}
                    </option>
                ))}
            </select>
        </label>
    )
}

export function FunctionSignatureFields({
    signature,
    onChange,
}: {
    signature: PythonSignature
    onChange: (signature: PythonSignature) => void
}) {
    return (
        <fieldset className="space-y-3 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium">
                Function signature
            </legend>
            <p className="text-xs text-muted-foreground">
                Types apply to every test case. Add arguments in call order.
                Lists and objects are checked at the outer level.
            </p>
            {signature.arguments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No arguments. Use [] in each case.
                </p>
            )}
            {signature.arguments.map((type, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                    <TypeSelect
                        label={`Argument ${index + 1} type`}
                        value={type}
                        onChange={(next) =>
                            onChange({
                                ...signature,
                                arguments: signature.arguments.map((item, i) =>
                                    i === index ? next : item
                                ),
                            })
                        }
                    />
                    <Button
                        variant="ghost"
                        type="button"
                        size="sm"
                        onClick={() =>
                            onChange({
                                ...signature,
                                arguments: signature.arguments.filter(
                                    (_, i) => i !== index
                                ),
                            })
                        }
                    >
                        Remove argument {index + 1}
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                disabled={signature.arguments.length >= MAX_ARGUMENTS}
                onClick={() =>
                    onChange({
                        ...signature,
                        arguments: [...signature.arguments, "int"],
                    })
                }
            >
                Add argument
            </Button>
            <TypeSelect
                label="Return type"
                value={signature.returns}
                onChange={(returns) => onChange({ ...signature, returns })}
            />
        </fieldset>
    )
}
