"use client"

import * as React from "react"
import { Check, ChevronDown, X, Plus } from "lucide-react"
import ProjectDialog, { ProjectFormType } from "./ProjectDialog"
import { formatProjectNumberForDisplay } from "@/shared/lib/invoiceHelper"

export interface ProjectOption {
  id: string
  name: string
  projectNumber?: string | null
  startDate?: string | null
  endDate?: string | null
}

interface ProjectMultiSelectComboboxProps {
  projects: ProjectOption[]
  value: string[]
  onChange: (projectIds: string[]) => void
  onProjectCreated?: (project: ProjectOption) => void
  onSaveNewProject: (project: ProjectFormType) => Promise<ProjectOption>
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  overviewMode?: boolean
  paddingYValue?: string
  /**
   * When true the combobox behaves as a single-select:
   * - Selecting an item replaces the current value (instead of toggling)
   * - The dropdown closes immediately after selection
   * - Backspace does NOT remove the last tag
   * All other features (search, keyboard nav, Add New Project) are unchanged.
   */
  singleSelect?: boolean
  onEdit?: (id: string) => void
}

export function ProjectMultiSelectCombobox({
  projects,
  value,
  onChange,
  onProjectCreated,
  onSaveNewProject,
  placeholder = "Select Projects",
  emptyMessage = "No project found.",
  disabled = false,
  overviewMode = false,
  paddingYValue = "py-3",
  singleSelect = false,
  onEdit
}: ProjectMultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [projectDialogOpen, setProjectDialogOpen] = React.useState(false)
  const [savingProject, setSavingProject] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const uniqueValue = React.useMemo(
    () => Array.from(new Set(value)),
    [value]
  )

  const uniqueProjects = React.useMemo(
    () => [...new Map(projects.map((p) => [p.id, p])).values()],
    [projects]
  )

  const selectedProjects = React.useMemo(
    () => uniqueProjects.filter((p) => uniqueValue.includes(p.id)),
    [uniqueProjects, uniqueValue]
  )

  const filteredProjects = React.useMemo(() => {
    if (!inputValue) return uniqueProjects
    return uniqueProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        p.projectNumber?.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [uniqueProjects, inputValue])

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredProjects])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setInputValue("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ─── Core selection logic ────────────────────────────────────────────────
  const toggleProject = (project: ProjectOption) => {
    if (singleSelect) {
      // Single-select: replace value, close dropdown
      onChange([project.id])
      setInputValue("")
      setOpen(false)
    } else {
      // Multi-select: toggle membership
      if (value.includes(project.id)) {
        onChange(value.filter((id) => id !== project.id))
      } else {
        onChange(Array.from(new Set([...value, project.id])))
      }
      setInputValue("")
      inputRef.current?.focus()
    }
  }

  const removeProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((id) => id !== projectId))
  }
  // ────────────────────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!open) setOpen(true)
  }

  const handleInputFocus = () => setOpen(true)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // STEP 1: Handle F2 (EDIT)
    if (e.key === "F2") {
      e.preventDefault()

      let projectToEdit: ProjectOption | undefined

      if (singleSelect) {
        // Single select → edit selected project
        projectToEdit = selectedProjects[0]
      } else {
        // Multi select → edit highlighted project
        projectToEdit = filteredProjects[highlightedIndex]
      }

      if (projectToEdit?.id) {
        onEdit?.(projectToEdit.id)
      }

      return
    }

    // STEP 2: Open dropdown if closed
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        setOpen(true)
        e.preventDefault()
      }
      return
    }

    // STEP 3: Normal navigation
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredProjects.length - 1 ? prev + 1 : prev
        )
        break

      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : 0
        )
        break

      case "Enter":
        e.preventDefault()
        if (filteredProjects[highlightedIndex]) {
          toggleProject(filteredProjects[highlightedIndex])
        }
        break

      case "Escape":
        e.preventDefault()
        setOpen(false)
        setInputValue("")
        break

      case "Backspace":
        if (!singleSelect && !inputValue && selectedProjects.length > 0) {
          onChange(value.slice(0, -1))
        }
        break

      case "Tab":
        setOpen(false)
        break
    }
  }

  React.useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement
      if (el) el.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, open])

  const handleOpenProjectDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    setProjectDialogOpen(true)
  }

  const handleSaveNewProject = async (form: ProjectFormType) => {
    setSavingProject(true)
    try {
      const newProject = await onSaveNewProject(form)
      if (singleSelect) {
        onChange([newProject.id])
      } else {
        onChange(Array.from(new Set([...value, newProject.id])))
      }
      onProjectCreated?.(newProject)
      setProjectDialogOpen(false)
    } finally {
      setSavingProject(false)
    }
  }

  React.useEffect(() => {
  const handleGlobalKey = (e: KeyboardEvent) => {
    if (e.key === "F2") {
      e.preventDefault()

      let projectToEdit: ProjectOption | undefined

      if (singleSelect) {
        projectToEdit = selectedProjects[0]
      } else {
        projectToEdit = filteredProjects[highlightedIndex]
      }

      if (projectToEdit?.id) {
        onEdit?.(projectToEdit.id)
      }
    }
  }

  const el = containerRef.current
  el?.addEventListener("keydown", handleGlobalKey)

  return () => {
    el?.removeEventListener("keydown", handleGlobalKey)
  }
}, [selectedProjects, filteredProjects, highlightedIndex, singleSelect, onEdit])

  return (
    <>
      <div ref={containerRef} tabIndex={0} className="relative w-full">
        {/* Trigger / tag container */}
        <div
          className={`flex flex-wrap items-center gap-1.5 w-full max-h-25 overflow-auto px-3 ${paddingYValue} rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm cursor-text transition-all duration-200
            ${open ? "ring-2 ring-[#31BCFF]/50 border-[#31BCFF]" : ""}
            ${disabled || overviewMode ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => {
            if (!disabled && !overviewMode) {
              setOpen(true)
              inputRef.current?.focus()
            }
          }}
        >
          {/* Selected project tags */}
          {selectedProjects.map((project) => (
            <span
    key={project.id}
    onClick={() => inputRef.current?.focus()} 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#31BCFF]/10 text-[#0EA5E9] text-sm font-medium border border-[#31BCFF]/20"
            >
              {project.projectNumber ? project.name : project.name}
              {!disabled && !overviewMode && (
                <button
                  type="button"
                  onClick={(e) => removeProject(project.id, e)}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {/* Search input — hide when single-select already has a value */}
          {(!singleSelect || selectedProjects.length === 0) && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              disabled={disabled || overviewMode}
              placeholder={selectedProjects.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[120px] bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-sm"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-autocomplete="list"
            />
          )}

          {/* Chevron */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled && !overviewMode) {
                setOpen(!open)
                if (!open) inputRef.current?.focus()
              }
            }}
            className="ml-auto text-gray-500 hover:text-gray-700 shrink-0"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Dropdown list */}
        {open && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-gray-600 shadow-lg"
          >
            {filteredProjects.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
            ) : (
              filteredProjects.map((project, index) => {
                const isSelected = value.includes(project.id)
                return (
                  <li
                    key={project.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleProject(project)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors text-white
                      ${highlightedIndex === index ? "bg-blue-500" : ""}
                      ${isSelected ? "font-medium" : ""}`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 text-white shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
                    />
                    <span>
                      {project.projectNumber && (
                        <span className="text-gray-300 mr-1">
                          {formatProjectNumberForDisplay(project.projectNumber)} –
                        </span>
                      )}
                      {project.name}
                    </span>
                  </li>
                )
              })
            )}

            {/* Sticky "Add New Project" button */}
            <li className="sticky bottom-0 border-t border-gray-500 bg-gray-700">
              <button
                type="button"
                onClick={handleOpenProjectDialog}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#31BCFF] hover:bg-gray-600 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add New Project
              </button>
            </li>
          </ul>
        )}
      </div>

      {projectDialogOpen && (
        <ProjectDialog
          open={true}
          onOpenChange={setProjectDialogOpen}
          loading={savingProject}
          onSave={handleSaveNewProject}
        />
      )}
    </>
  )
}