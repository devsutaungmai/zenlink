"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { useColumnVisibility } from "@/hooks/use-column-visibility"
import { ColumnVisibilityToggle } from "@/components/invoice/column-visibility-toggle"
import { Switch } from "@/components/ui/switch"
import { start } from "repl"
import { useResizableColumns } from "@/hooks/use-resizable-columns"

interface Customer {
  id: string
  customerName: string
}
interface ProjectCategory {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
  projectNumber?: string | null
  active: boolean
  categoryId: string | null
  category?: ProjectCategory | null
  startDate?: string | null
  endDate?: string | null
  customerId?: string | null
  customer?: Customer | null
}

export default function ProjectPage() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedFilter, setSelectedFilter] = useState('active')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const COLUMNS = [
    { key: "projectNumber", label: "Project Number" },
    { key: "name", label: "Project Name" },
    { key: "customer", label: "Customer" },
    { key: "category", label: "Category" },
    { key: "startDate", label: "Start Date" },
    { key: "endDate", label: "End Date" },
    { key: "active", label: "Status" },
  ]

  const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
    storageKey: "projects-columns",
    initialColumns: COLUMNS,
    defaultVisibility: {
      projectNumber: true,
      name: true,
      customer: true,
      category: true,
      startDate: false,
      endDate: false,
      active: true,
    },
  })

  const RESIZABLE_COLUMNS = [
    { key: "projectNumber", initialWidth: 120, minWidth: 80 },
    { key: "name", initialWidth: 220, minWidth: 120 },
    { key: "customer", initialWidth: 180, minWidth: 120 },
    { key: "category", initialWidth: 140, minWidth: 100 },
    { key: "startDate", initialWidth: 150, minWidth: 100 },
    { key: "endDate", initialWidth: 150, minWidth: 100 },
    { key: "active", initialWidth: 100, minWidth: 70 },
    { key: "actions", initialWidth: 120, minWidth: 80 },
  ]
  const { getColumnWidth, onMouseDown, resetWidths } = useResizableColumns({
    storageKey: "project-col-widths",
    columns: RESIZABLE_COLUMNS,
  })

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.error("API did not return an array:", data)
        setProjects([])
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      const result = await Swal.fire({
        title: t("common.confirm"),
        text: `Are you sure you want to delete "${name}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#31BCFF",
        cancelButtonColor: "#d33",
        confirmButtonText: t("common.yes"),
        cancelButtonText: t("common.cancel"),
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/projects/${id}`, {
          method: "DELETE",
        })

        if (res.ok) {
          setProjects(projects.filter((cust) => cust.id !== id))

          await Swal.fire({
            title: t("common.success"),
            text: "Project deleted successfully",
            icon: "success",
            confirmButtonColor: "#31BCFF",
          })
        } else {
          throw new Error("Failed to delete project")
        }
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      await Swal.fire({
        title: t("common.error"),
        text: "Failed to delete project",
        icon: "error",
        confirmButtonColor: "#31BCFF",
      })
    }
  }
  const handleFilterClick = (filter: string) => () => {
    setSelectedFilter(filter)
    setCurrentPage(1)
  }
  const filteredprojects = projects.filter(
    (project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        selectedFilter === 'all' ||
        (selectedFilter === 'active' && project.active) ||
        (selectedFilter === 'inactive' && !project.active)
      return matchesSearch && matchesFilter
    }
  )

  const totalPages = Math.ceil(filteredprojects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = filteredprojects.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleStatusChange = async (projectId: string, newStatus: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/toggle-active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: projectId, active: newStatus }),
      })

      if (res.ok) {
        const updatedProject = await res.json()
        setProjects((prevProjects) =>
          prevProjects.map((project) =>
            project.id === projectId ? { ...project, active: updatedProject.active } : project,
          ),
        )
      } else {
        // throw new Error("Failed to update project status")
        await Swal.fire({
          title: t("common.error"),
          text: "Failed to update project status",
          icon: "error",
          confirmButtonColor: "#31BCFF",
        })
      }
    } catch (error) {
      console.error("Error updating project status:", error)
      await Swal.fire({
        title: t("common.error"),
        text: "Failed to update project status",
        icon: "error",
        confirmButtonColor: "#31BCFF",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Projects
            </h1>
            <p className="mt-2 text-gray-600">Manage project</p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {projects.length} {projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/projects/create"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            Create Project
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            Showing {paginatedProjects.length} of {filteredprojects.length}
          </div>
        </div>
        {/* Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <FunnelIcon className="w-4 h-4 flex-shrink-0" />
              <span>Filter</span>
            </div> */}
            {[
              { value: 'all', label: "ALL" },
              { value: 'active', label: "ACTIVE" },
              { value: 'inactive', label: "INACTIVE" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={handleFilterClick(filter.value)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${selectedFilter === filter.value
                  ? 'bg-[#31BCFF] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredprojects.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first project"}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/projects/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create First Project
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  {isColumnVisible("projectNumber") && (
                    <col style={{ width: getColumnWidth("projectNumber") }} />
                  )}
                  {isColumnVisible("name") && (
                    <col style={{ width: getColumnWidth("name") }} />
                  )}
                  {isColumnVisible("customer") && (
                    <col style={{ width: getColumnWidth("customer") }} />
                  )}
                  {isColumnVisible("category") && (
                    <col style={{ width: getColumnWidth("category") }} />
                  )}
                  {isColumnVisible("startDate") && (
                    <col style={{ width: getColumnWidth("startDate") }} />
                  )}
                  {isColumnVisible("endDate") && (
                    <col style={{ width: getColumnWidth("endDate") }} />
                  )}
                  {isColumnVisible("active") && (
                    <col style={{ width: getColumnWidth("active") }} />
                  )}
                  <col style={{ width: getColumnWidth("actions") }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    {isColumnVisible("projectNumber") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Project No.
                        <div
                          onMouseDown={onMouseDown("projectNumber")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("name") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Project Name
                        <div
                          onMouseDown={onMouseDown("name")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("customer") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Customer
                        <div
                          onMouseDown={onMouseDown("customer")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("category") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Category
                        <div
                          onMouseDown={onMouseDown("category")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("startDate") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Start Date
                        <div
                          onMouseDown={onMouseDown("startDate")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("endDate") && (
                      <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        End Date
                        <div
                          onMouseDown={onMouseDown("endDate")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    {isColumnVisible("active") && (
                      <th className="relative px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider select-none border-r border-border">
                        Status
                        <div
                          onMouseDown={onMouseDown("active")}
                          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#31BCFF]"
                        />
                      </th>
                    )}
                    <th className="relative px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-border">
                      <div className="flex items-center justify-end gap-2">
                        <span>Actions</span> 
                        <ColumnVisibilityToggle
                          columns={columns}
                          onColumnToggle={toggleColumn}
                          onResetColumns={() => {
                            resetColumns()
                            resetWidths()
                          }}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                      {isColumnVisible("projectNumber") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                            href={`/dashboard/projects/${project.id}/edit`}
                            title="Edit Project"
                          >
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#31BCFF]/10 text-blue-600 hover:underline">
                            {project.projectNumber || "-"}
                          </span>
                          </Link>
                        </td>
                      )}
                      {isColumnVisible("name") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                             <Link
                            href={`/dashboard/projects/${project.id}/edit`}
                            title="Edit Project"
                          >
                          <span className="text-sm font-medium text-blue-600 hover:underline">{project.name}</span>
                          </Link>
                        </td>
                      )}
                      {isColumnVisible("customer") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{project.customer?.customerName || "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("category") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{project.category?.name || "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("startDate") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("endDate") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("active") && (
                        <td className="px-6 py-4">
                          {/* <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {project.active ? "Active" : "Inactive"}
                          </span> */}
                          <div className="flex items-center">
                            <Switch
                              id="status"
                              checked={project.active}
                              onCheckedChange={(checked) => handleStatusChange(project.id, checked)}
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/projects/${project.id}/edit`}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Project"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(project.id, project.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Project"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredprojects.length)} of{" "}
                    {filteredprojects.length} projects
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${currentPage === page ? "bg-[#31BCFF] text-white" : "text-gray-600 hover:bg-gray-100"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedProjects.map((project) => (
              <div
                key={project.id}
                className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isColumnVisible("projectNumber") && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#31BCFF]/10 text-[#31BCFF]">
                          {project.projectNumber}
                        </span>
                      )}
                      {isColumnVisible("active") && project.active !== null && (
                        // <span
                        //   className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        //     }`}
                        // >
                        //   {project.active ? "Active" : "Inactive"}
                        // </span>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="status"
                            checked={project.active}
                            onCheckedChange={(checked) => handleStatusChange(project.id, checked)}
                          />
                        </div>
                      )}
                    </div>
                    {isColumnVisible("name") && <h3 className="text-lg font-semibold text-gray-900 mt-2">{project.name}</h3>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Edit Project"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete Project"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <ColumnVisibilityToggle
                      columns={columns}
                      onColumnToggle={toggleColumn}
                      onResetColumns={resetColumns}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {isColumnVisible("customer") && project.customer?.customerName && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="truncate">{project.customer.customerName}</span>
                    </div>
                  )}
                  {isColumnVisible("category") && project.category?.name && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="truncate">{project.category.name}</span>
                    </div>
                  )}
                  {isColumnVisible("startDate") && project.startDate && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="truncate">{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {isColumnVisible("endDate") && project.endDate && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="truncate">{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
