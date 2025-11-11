'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Category {
  id: string
  name: string
  color?: string | null
  department: {
    id: string
    name: string
  }
}

interface Function {
  id: string
  name: string
  color?: string | null
  categoryId: string
  category: Category
}

export default function EditFunctionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    categoryId: ''
  })

  useEffect(() => {
    fetchCategories()
    fetchFunction()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchFunction = async () => {
    try {
      const response = await fetch(`/api/functions/${resolvedParams.id}`)
      if (response.ok) {
        const data: Function = await response.json()
        setFormData({
          name: data.name,
          color: data.color || '#3B82F6',
          categoryId: data.categoryId
        })
      } else {
        await Swal.fire({
          title: 'Error!',
          text: 'Function not found',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
        router.push('/dashboard/functions')
      }
    } catch (error) {
      console.error('Error fetching function:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      await Swal.fire({
        title: 'Error!',
        text: 'Please enter a function name',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
      return
    }

    if (!formData.categoryId) {
      await Swal.fire({
        title: 'Error!',
        text: 'Please select a category',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/functions/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await Swal.fire({
          title: 'Success!',
          text: 'Function updated successfully',
          icon: 'success',
          confirmButtonColor: '#3B82F6'
        })
        router.push('/dashboard/functions')
      } else {
        const error = await response.json()
        await Swal.fire({
          title: 'Error!',
          text: error.error || 'Failed to update function',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        })
      }
    } catch (error) {
      console.error('Error updating function:', error)
      await Swal.fire({
        title: 'Error!',
        text: 'An error occurred while updating the function',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/functions"
              className="p-2 hover:bg-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Function</h1>
              <p className="mt-2 text-gray-600">Update function details</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Function Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Function Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Hot Section, Hall 1, Prepping"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                A specific role or task within the category
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.department.name})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                The category this function belongs to
              </p>
            </div>

            {/* Color */}
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#3B82F6"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Optional color to distinguish this function
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Function'}
              </button>
              <Link
                href="/dashboard/functions"
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
