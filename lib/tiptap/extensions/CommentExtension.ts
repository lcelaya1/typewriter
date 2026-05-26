import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType
      unsetComment: (commentId: string) => ReturnType
    }
  }
}

export const CommentExtension = Mark.create({
  name: 'comment',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attrs => ({ 'data-comment-id': attrs.commentId }),
      },
      active: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'comment-mark' }), 0]
  },

  addCommands() {
    return {
      setComment: (commentId: string) => ({ commands }) => {
        return commands.setMark(this.name, { commentId })
      },
      unsetComment: (commentId: string) => ({ tr, state, dispatch }) => {
        const { doc } = state
        let found = false
        doc.descendants((node, pos) => {
          if (found) return false
          node.marks.forEach(mark => {
            if (mark.type === this.type && mark.attrs.commentId === commentId) {
              if (dispatch) {
                tr.removeMark(pos, pos + node.nodeSize, this.type)
              }
              found = true
            }
          })
        })
        if (dispatch) dispatch(tr)
        return found
      },
    }
  },
})
