import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      setTrackChangesEnabled: (enabled: boolean) => ReturnType
      acceptChange: (id: string) => ReturnType
      rejectChange: (id: string) => ReturnType
      acceptAllChanges: () => ReturnType
      rejectAllChanges: () => ReturnType
    }
  }
}

export interface TrackedChange {
  id: string
  type: 'insert' | 'delete'
  author: string
  authorId: string
  timestamp: string
  content: string
  from: number
  to: number
}

export const TrackInsert = Mark.create({
  name: 'trackInsert',
  addAttributes() {
    return {
      changeId: { default: null },
      author: { default: null },
      timestamp: { default: null },
    }
  },
  parseHTML() { return [{ tag: 'ins[data-change-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['ins', mergeAttributes(HTMLAttributes, { class: 'track-insert', 'data-change-id': HTMLAttributes.changeId }), 0]
  },
  inclusive: true,
})

export const TrackDelete = Mark.create({
  name: 'trackDelete',
  addAttributes() {
    return {
      changeId: { default: null },
      author: { default: null },
      timestamp: { default: null },
    }
  },
  parseHTML() { return [{ tag: 'del[data-change-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['del', mergeAttributes(HTMLAttributes, { class: 'track-delete', 'data-change-id': HTMLAttributes.changeId }), 0]
  },
  inclusive: false,
})

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export const TrackChanges = Extension.create({
  name: 'trackChanges',

  addStorage() {
    return { enabled: false, currentUser: null as { id: string; name: string } | null }
  },

  addCommands() {
    return {
      setTrackChangesEnabled: (enabled: boolean) => ({ editor }) => {
        ;(editor.storage as any).trackChanges.enabled = enabled
        return true
      },
      acceptChange: (id: string) => ({ tr, state, dispatch }) => {
        state.doc.descendants((node, pos) => {
          node.marks.forEach(mark => {
            if ((mark.type.name === 'trackInsert' || mark.type.name === 'trackDelete') && mark.attrs.changeId === id) {
              if (mark.type.name === 'trackInsert') {
                tr.removeMark(pos, pos + node.nodeSize, mark.type)
              } else {
                tr.delete(pos, pos + node.nodeSize)
              }
            }
          })
        })
        if (dispatch) dispatch(tr)
        return true
      },
      rejectChange: (id: string) => ({ tr, state, dispatch }) => {
        state.doc.descendants((node, pos) => {
          node.marks.forEach(mark => {
            if ((mark.type.name === 'trackInsert' || mark.type.name === 'trackDelete') && mark.attrs.changeId === id) {
              if (mark.type.name === 'trackInsert') {
                tr.delete(pos, pos + node.nodeSize)
              } else {
                tr.removeMark(pos, pos + node.nodeSize, mark.type)
              }
            }
          })
        })
        if (dispatch) dispatch(tr)
        return true
      },
      acceptAllChanges: () => ({ tr, state, dispatch }) => {
        state.doc.descendants((node, pos) => {
          node.marks.forEach(mark => {
            if (mark.type.name === 'trackInsert') tr.removeMark(pos, pos + node.nodeSize, mark.type)
            if (mark.type.name === 'trackDelete') tr.delete(pos, pos + node.nodeSize)
          })
        })
        if (dispatch) dispatch(tr)
        return true
      },
      rejectAllChanges: () => ({ tr, state, dispatch }) => {
        state.doc.descendants((node, pos) => {
          node.marks.forEach(mark => {
            if (mark.type.name === 'trackDelete') tr.removeMark(pos, pos + node.nodeSize, mark.type)
            if (mark.type.name === 'trackInsert') tr.delete(pos, pos + node.nodeSize)
          })
        })
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this

    return [
      new Plugin({
        key: new PluginKey('trackChangesInput'),
        props: {
          // Intercept typed text
          handleTextInput(view, from, to, text) {
            const storage = (editor.storage as any).trackChanges
            if (!storage?.enabled) return false

            const user = storage.currentUser || { id: 'unknown', name: 'Unknown' }
            const { state } = view
            let tr = state.tr
            const timestamp = new Date().toISOString()

            // If replacing a selection, mark existing text as deleted
            if (from < to) {
              const delMark = state.schema.marks.trackDelete.create({
                changeId: newId(), author: user.name, timestamp,
              })
              tr = tr.addMark(from, to, delMark)
              // Move insertion point to after the "deleted" text (which we kept)
              from = to
            }

            // Insert new text with trackInsert mark at the insertion position
            const insMark = state.schema.marks.trackInsert.create({
              changeId: newId(), author: user.name, timestamp,
            })
            tr = tr.insertText(text, from, from)
            tr = tr.addMark(from, from + text.length, insMark)

            view.dispatch(tr)
            return true
          },

          // Intercept Backspace / Delete
          handleKeyDown(view, event) {
            const storage = (editor.storage as any).trackChanges
            if (!storage?.enabled) return false

            const isBackspace = event.key === 'Backspace'
            const isDelete = event.key === 'Delete'
            if (!isBackspace && !isDelete) return false

            const { state } = view
            const { selection } = state
            const { from, to, empty } = selection

            if (empty) {
              // Single character delete
              const delFrom = isBackspace ? Math.max(0, from - 1) : from
              const delTo = isBackspace ? from : Math.min(state.doc.content.size, to + 1)
              if (delFrom === delTo) return true // nothing to delete

              const delMark = state.schema.marks.trackDelete.create({
                changeId: newId(),
                author: (storage.currentUser || { name: 'Unknown' }).name,
                timestamp: new Date().toISOString(),
              })
              const tr = state.tr.addMark(delFrom, delTo, delMark)
              // Move cursor to the correct position
              if (isBackspace) {
                tr.setSelection(TextSelection.near(tr.doc.resolve(delFrom)))
              } else {
                tr.setSelection(TextSelection.near(tr.doc.resolve(delTo)))
              }
              view.dispatch(tr)
              return true
            } else {
              // Range delete — mark whole selection as deleted
              const delMark = state.schema.marks.trackDelete.create({
                changeId: newId(),
                author: (storage.currentUser || { name: 'Unknown' }).name,
                timestamp: new Date().toISOString(),
              })
              const tr = state.tr.addMark(from, to, delMark)
              // Collapse selection to start
              tr.setSelection(TextSelection.near(tr.doc.resolve(from)))
              view.dispatch(tr)
              return true
            }
          },
        },
      }),
    ]
  },
})
