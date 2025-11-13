'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import { forwardRef, useImperativeHandle } from 'react'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

export interface RichTextEditorRef {
  getHTML: () => string
  getText: () => string
  setContent: (content: string) => void
  focus: () => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content = '', onChange, placeholder = 'Start typing...', className, editable = true }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Underline,
      ],
      content,
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: cn(
            'focus:outline-none min-h-[200px] p-3',
            className
          ),
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      setContent: (content: string) => editor?.commands.setContent(content),
      focus: () => editor?.commands.focus(),
    }))

    if (!editor) {
      return null
    }

    const colors = [
      '#000000', '#374151', '#6B7280', '#9CA3AF',
      '#EF4444', '#F97316', '#EAB308', '#22C55E',
      '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
    ]

    const highlights = [
      '#FEF3C7', '#FED7AA', '#FECACA', '#D1FAE5',
      '#CFFAFE', '#DBEAFE', '#E9D5FF', '#FECDD3'
    ]

    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#31BCFF] focus-within:border-[#31BCFF]">
        {editable && (
          <div className="border-b border-gray-200 p-2 bg-gray-50">
            <div className="flex flex-wrap items-center gap-1">
              {/* Text Formatting */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('bold') && 'bg-gray-200'
                )}
              >
                <Bold className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('italic') && 'bg-gray-200'
                )}
              >
                <Italic className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('underline') && 'bg-gray-200'
                )}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('strike') && 'bg-gray-200'
                )}
              >
                <Strikethrough className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Lists */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('bulletList') && 'bg-gray-200'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive('orderedList') && 'bg-gray-200'
                )}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Text Alignment */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive({ textAlign: 'left' }) && 'bg-gray-200'
                )}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive({ textAlign: 'center' }) && 'bg-gray-200'
                )}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive({ textAlign: 'right' }) && 'bg-gray-200'
                )}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={cn(
                  'h-8 px-2',
                  editor.isActive({ textAlign: 'justify' }) && 'bg-gray-200'
                )}
              >
                <AlignJustify className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Text Color */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Text Color</p>
                      <div className="grid grid-cols-6 gap-1">
                        {colors.map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => editor.chain().focus().setColor(color).run()}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Highlight</p>
                      <div className="grid grid-cols-4 gap-1">
                        {highlights.map((color) => (
                          <button
                            key={color}
                            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => editor.chain().focus().setHighlight({ color }).run()}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()}
                        className="w-full text-xs"
                      >
                        Clear Formatting
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-6" />

              {/* Undo/Redo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 px-2"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 px-2"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="relative">
          <EditorContent 
            editor={editor} 
            className="min-h-[200px]"
          />
          {editor.isEmpty && (
            <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export { RichTextEditor }
